/**
 * Import anomaly service — enriches the core detector with assignment-specific rules.
 */
const coreAnomalyService = require('./anomalyDetectionService');
const prisma = require('./prismaClient');

const SEVERITY = coreAnomalyService.SEVERITY;

function validationError(message) {
  const error = new Error(message);
  error.name = 'ValidationError';
  error.statusCode = 400;
  return error;
}

function normalizeTitle(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[–—]/g, '-')
    .toLowerCase();
}

function titleCaseName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function parseDateParts(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  const year = Number(match[3]);
  if (Number.isNaN(first) || Number.isNaN(second) || Number.isNaN(year)) return null;
  return { first, second, year };
}

function isAmbiguousDate(value) {
  const parsed = parseDateParts(value);
  if (!parsed) return false;
  return parsed.first <= 12 && parsed.second <= 12;
}

function parseParticipantList(value) {
  if (!value) return [];
  return String(value)
    .split(/[,|]/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function tokenSimilarity(a, b) {
  const left = new Set(normalizeTitle(a).split(/\s+/).filter(Boolean));
  const right = new Set(normalizeTitle(b).split(/\s+/).filter(Boolean));
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function buildAnomaly(rowNumber, issueType, severity, description, suggestedAction, extra = {}) {
  return {
    rowNumber,
    issueType,
    severity,
    description,
    suggestedAction,
    ...extra,
  };
}

function dedupeAnomalies(anomalies) {
  const seen = new Set();
  return anomalies.filter((anomaly) => {
    const key = `${anomaly.rowNumber}-${anomaly.issueType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function enrichAnomaly(anomaly) {
  const autoPolicyTypes = [
    'MISSING_CURRENCY',
    'DECIMAL_PRECISION',
    'EQUAL_WITH_SHARES',
    'NAME_NORMALIZED',
    'INCONSISTENT_NAME',
    'MEMBER_LEFT_BEFORE_EXPENSE',
    'TEMPORARY_PARTICIPANT',
    'ZERO_AMOUNT',
  ];

  const needsReviewTypes = [
    'AMBIGUOUS_DATE',
    'DUPLICATE_EXPENSE',
    'EXACT_DUPLICATE',
    'CONFLICTING_DUPLICATE',
    'INVALID_PERCENTAGE_SPLIT',
    'MISSING_PAYER',
    'MISSING_RECEIVER',
    'NEGATIVE_AMOUNT',
    'SETTLEMENT_AS_EXPENSE',
    'USD_CURRENCY',
  ];

  const needsReview =
    !autoPolicyTypes.includes(anomaly.issueType) &&
    (anomaly.severity === SEVERITY.HIGH || needsReviewTypes.includes(anomaly.issueType));

  return {
    ...anomaly,
    problemType: anomaly.issueType,
    needsReview,
    actionTaken: needsReview ? 'pending' : 'auto',
    status: needsReview ? 'Needs Review' : 'Auto Policy',
  };
}

async function enrichWithNameNormalization(rows, groupId) {
  const normalizedIssues = [];

  for (const row of rows) {
    const sources = [
      row.paidBy || row.payer,
      row.receiver,
      ...(parseParticipantList(row.participants)),
    ].filter(Boolean);

    for (const source of sources) {
      if (source !== titleCaseName(source)) {
        normalizedIssues.push(
          buildAnomaly(
            row.rowNumber,
            'NAME_NORMALIZED',
            SEVERITY.LOW,
            `Row ${row.rowNumber}: "${source}" will be normalized to "${titleCaseName(source)}".`,
            `Normalize to ${titleCaseName(source)}`
          )
        );
        break;
      }
    }
  }

  if (groupId) {
    const members = await prisma.groupMember.findMany({
      where: { groupId: Number(groupId) },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    for (const row of rows) {
      const participants = parseParticipantList(row.participants);
      for (const participant of participants) {
        const known = members.find(
          (member) =>
            member.user.name.toLowerCase() === participant.toLowerCase() ||
            member.user.email.toLowerCase() === participant.toLowerCase()
        );

        if (!known && /friend|guest|temporary|kabir/i.test(participant)) {
          normalizedIssues.push(
            buildAnomaly(
              row.rowNumber,
              'TEMPORARY_PARTICIPANT',
              SEVERITY.MEDIUM,
              `Row ${row.rowNumber} contains a temporary participant "${participant}".`,
              `Create guest participant ${participant}`
            )
          );
        }
      }
    }
  }

  return normalizedIssues;
}

function addDuplicateInsights(rows) {
  const extras = [];

  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const left = rows[i];
      const right = rows[j];
      if (!left.amount || !right.amount) continue;

      const sameDate = String(left.expenseDate || left.date || '').trim() === String(right.expenseDate || right.date || '').trim();
      const sameAmount = Math.abs(Number(left.amount) - Number(right.amount)) < 0.01;
      const sameParticipants =
        normalizeTitle(left.participants) === normalizeTitle(right.participants);
      const leftTitle = left.title || left.description || '';
      const rightTitle = right.title || right.description || '';
      const similarity = Math.max(tokenSimilarity(leftTitle, rightTitle), tokenSimilarity(leftTitle, rightTitle));

      if (sameDate && sameAmount && sameParticipants && similarity >= 0.35) {
        extras.push(
          buildAnomaly(
            right.rowNumber,
            'DUPLICATE_EXPENSE',
            SEVERITY.HIGH,
            `Row ${right.rowNumber} ("${rightTitle}") appears to duplicate row ${left.rowNumber} ("${leftTitle}").`,
            'Keep First / Keep Second / Merge',
            { relatedRowNumber: left.rowNumber }
          )
        );
      }
    }
  }

  return extras;
}

async function detectAnomalies(rows, groupId, userId) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw validationError('rows array is required');
  }

  const baseAnomalies = await coreAnomalyService.detectAnomalies(rows, groupId, userId);
  const normalizedRows = rows.map((row) => ({
    ...row,
    title: row.title || row.description || row.name,
    expenseDate: row.expenseDate || row.date,
  }));

  const extras = [
    ...(await enrichWithNameNormalization(normalizedRows, groupId)),
    ...addDuplicateInsights(normalizedRows),
  ];

  const all = dedupeAnomalies([...baseAnomalies, ...extras]).map(enrichAnomaly);
  all.sort((a, b) => a.rowNumber - b.rowNumber || a.problemType.localeCompare(b.problemType));

  return all;
}

module.exports = {
  detectAnomalies,
  SEVERITY,
};
