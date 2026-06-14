/**
 * ImportReportCard — summary of a completed CSV import.
 */
function ImportReportCard({ label, value, variant = 'default' }) {
  const variants = {
    default: 'border-slate-200 text-gray-900',
    success: 'border-green-200 text-green-700',
    warning: 'border-amber-200 text-amber-700',
    info: 'border-indigo-200 text-indigo-700',
  };

  const badgeVariants = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-indigo-100 text-indigo-700',
  };

  return (
    <div className={`rounded-xl border bg-white p-5 shadow-md ${variants[variant]}`}>
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeVariants[variant]}`}
      >
        {label}
      </span>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}

export default ImportReportCard;
