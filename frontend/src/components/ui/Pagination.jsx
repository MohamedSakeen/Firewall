import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Reusable Pagination component conforming to Section 12 of ValaiAran Design System.
 * Maximum 50 records per page by default.
 */
export default function Pagination({
  totalItems = 0,
  currentPage = 1,
  pageSize = 50,
  onPageChange,
  pageSizeOptions = null,
  onPageSizeChange = null,
  className = '',
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(totalItems, currentPage * pageSize);

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  if (totalItems === 0) {
    return null;
  }

  const btnStyle = (enabled) => ({
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    color: enabled ? 'var(--text-secondary)' : 'var(--text-disabled)',
    cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.4,
  });

  return (
    <div
      className={`flex items-center justify-between px-3 py-2 text-xs select-none ${className}`}
      style={{
        background: 'var(--bg-panel)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      {/* Context info: Showing 1–50 of 842 */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] text-[var(--text-muted)]">
          Showing <span className="text-[var(--text-primary)] font-medium">{startIndex}–{endIndex}</span> of <span className="text-[var(--text-primary)] font-medium">{totalItems}</span>
        </span>

        {pageSizeOptions && onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] ml-2">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="font-mono text-[11px] px-1.5 py-0.5 rounded outline-none"
              style={{
                background: 'var(--bg-inset)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => canPrev && onPageChange(currentPage - 1)}
          disabled={!canPrev}
          className="flex items-center gap-1 px-2.5 py-1 rounded transition-colors"
          style={btnStyle(canPrev)}
          title="Previous page"
        >
          <ChevronLeft size={13} />
          <span>Prev</span>
        </button>

        <span className="font-mono text-[11px] px-2 text-[var(--text-secondary)]">
          Page <span className="font-medium text-[var(--text-primary)]">{currentPage}</span> of <span className="font-medium text-[var(--text-primary)]">{totalPages}</span>
        </span>

        <button
          type="button"
          onClick={() => canNext && onPageChange(currentPage + 1)}
          disabled={!canNext}
          className="flex items-center gap-1 px-2.5 py-1 rounded transition-colors"
          style={btnStyle(canNext)}
          title="Next page"
        >
          <span>Next</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
