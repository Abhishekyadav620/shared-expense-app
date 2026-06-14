/**
 * ReviewModal — focused review UI for one anomaly requiring a decision.
 */
import AnomalyCard from './AnomalyCard';

function ReviewModal({ anomaly, decision, actions, onAction, onClose }) {
  if (!anomaly) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Review required</h2>
            <p className="mt-1 text-sm text-slate-500">
              Row {anomaly.rowNumber} — choose a policy action before importing
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <AnomalyCard
          anomaly={anomaly}
          decision={decision}
          actions={actions}
          onAction={onAction}
        />
      </div>
    </div>
  );
}

export default ReviewModal;
