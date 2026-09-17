import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { exportToCsv, exportToJson } from '../../utils/exportUtils';

/**
 * Compact [ Export ▼ ] dropdown control for cybersecurity console data views.
 * Adheres to Sections 14, 15, 16, 17 of ValaiAran Design System.
 */
export default function ExportMenu({
  filename = 'export',
  data = [],
  currentPageData = null,
  columns = null,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleExportCsvAll = () => {
    exportToCsv(`${filename}-all`, data, columns);
    setOpen(false);
  };

  const handleExportJsonAll = () => {
    exportToJson(`${filename}-all`, data);
    setOpen(false);
  };

  const handleExportCsvPage = () => {
    exportToCsv(`${filename}-page`, currentPageData || data, columns);
    setOpen(false);
  };

  const handleExportJsonPage = () => {
    exportToJson(`${filename}-page`, currentPageData || data);
    setOpen(false);
  };

  const hasPageData = currentPageData && currentPageData.length > 0 && currentPageData.length !== data.length;

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled || (!data.length && (!currentPageData || !currentPageData.length))}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.borderColor = 'var(--border-strong)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
          }
        }}
      >
        <Download size={12} />
        <span>Export</span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-44 rounded py-1 z-50 shadow-xl"
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
            Export Dataset
          </div>

          <button
            type="button"
            onClick={handleExportCsvAll}
            className="w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          >
            <span>CSV (All Results)</span>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">{data.length}</span>
          </button>

          <button
            type="button"
            onClick={handleExportJsonAll}
            className="w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          >
            <span>JSON (All Results)</span>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">{data.length}</span>
          </button>

          {hasPageData && (
            <>
              <div className="my-1 border-t border-[var(--border-subtle)]" />
              <button
                type="button"
                onClick={handleExportCsvPage}
                className="w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              >
                <span>CSV (Current Page)</span>
                <span className="font-mono text-[10px] text-[var(--text-muted)]">{currentPageData.length}</span>
              </button>

              <button
                type="button"
                onClick={handleExportJsonPage}
                className="w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              >
                <span>JSON (Current Page)</span>
                <span className="font-mono text-[10px] text-[var(--text-muted)]">{currentPageData.length}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
