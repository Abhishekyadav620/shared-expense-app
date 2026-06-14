/**
 * SummaryCard — displays one import statistic.
 */
const VARIANT_STYLES = {
  info: 'border-slate-200 bg-white text-slate-900',
  success: 'border-green-200 bg-green-50 text-green-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-800',
};

function SummaryCard({ label, value, variant = 'info', hint }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${VARIANT_STYLES[variant] || VARIANT_STYLES.info}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs opacity-70">{hint}</p>}
    </div>
  );
}

export default SummaryCard;
