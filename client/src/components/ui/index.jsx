// Reusable shared UI components

// Status Badge
export function StatusBadge({ status }) {
  const map = {
    active: 'badge-green', inactive: 'badge-gray', suspended: 'badge-red',
    pending: 'badge-amber', approved: 'badge-green', rejected: 'badge-red',
    paid: 'badge-green', processed: 'badge-blue', unpaid: 'badge-amber',
    present: 'badge-green', absent: 'badge-red', late: 'badge-amber', wfh: 'badge-blue',
    in_progress: 'badge-blue', completed: 'badge-green', planning: 'badge-purple',
    on_hold: 'badge-amber', cancelled: 'badge-red',
    published: 'badge-green', draft: 'badge-gray', scheduled: 'badge-blue',
    confirmed: 'badge-green', no_show: 'badge-red',
  };
  return (
    <span className={map[status] || 'badge-gray'}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

// Loading skeleton rows for tables
export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3.5">
              <div className="skeleton h-4 rounded w-full" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// Empty state
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={28} className="text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Modal
export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// Confirm dialog
export function ConfirmModal({ open, onClose, onConfirm, title, message, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title || 'Confirm Action'}
      footer={
        <>
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="btn btn-danger">
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600">{message}</p>
    </Modal>
  );
}

// Search input
export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="form-input pl-9 w-64 h-9 text-sm"
      />
    </div>
  );
}

// Pagination
export function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <p className="text-xs text-gray-500">Page {page} of {pages}</p>
      <div className="flex gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
          Prev
        </button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => onPageChange(p)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${p === page ? 'bg-navy text-white border-navy' : 'border-gray-200 hover:bg-gray-50'}`}>
            {p}
          </button>
        ))}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= pages}
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
          Next
        </button>
      </div>
    </div>
  );
}

// Stat card
export function StatCard({ icon: Icon, label, value, iconBg = 'bg-navy/10', iconColor = 'text-navy', trend, trendLabel }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconBg}`}>
        <Icon size={22} className={iconColor} />
      </div>
      <div>
        <p className="stat-value">{value ?? '—'}</p>
        <p className="stat-label">{label}</p>
        {trend !== undefined && (
          <p className={`text-xs font-medium mt-0.5 ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% {trendLabel}
          </p>
        )}
      </div>
    </div>
  );
}

// Page spinner
export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="skeleton h-4 w-1/3 rounded" />
      <div className="skeleton h-8 w-1/2 rounded" />
      <div className="skeleton h-3 w-2/3 rounded" />
    </div>
  );
}
