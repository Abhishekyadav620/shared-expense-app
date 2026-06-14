/**
 * Currency conversion — USD expenses are normalized to INR for balance math.
 * Priya's requirement: a dollar is NOT a rupee.
 */
function round2(num) {
  return Math.round(num * 100) / 100;
}

function getUsdToInrRate(customRate) {
  const rate = customRate ?? process.env.USD_TO_INR_RATE ?? 83;
  const parsed = parseFloat(rate);
  return Number.isNaN(parsed) || parsed <= 0 ? 83 : parsed;
}

/** Convert an amount to INR cents for ledger math. */
function toInrCents(amount, currency, usdToInrRate) {
  const cents = Math.round(parseFloat(amount || 0) * 100);
  if (String(currency).toUpperCase() === 'USD') {
    const rate = getUsdToInrRate(usdToInrRate);
    return Math.round(cents * rate);
  }
  return cents;
}

function toInr(amount, currency, usdToInrRate) {
  return round2(toInrCents(amount, currency, usdToInrRate) / 100);
}

module.exports = {
  getUsdToInrRate,
  toInrCents,
  toInr,
};
