import { useEffect } from 'react';
import { HiOutlineExclamation, HiOutlineX } from 'react-icons/hi';

/**
 * Reusable confirmation dialog.
 * Replaces the repeated inline delete modal pattern.
 */
export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', submitting = false, danger = true, note }) {
  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close"><HiOutlineX /></button>
        </div>
        <div className="modal-body">
          <div className="confirm-content">
            <div className="confirm-icon" style={{ color: danger ? 'var(--accent-danger)' : 'var(--accent-warning)' }}>
              <HiOutlineExclamation />
            </div>
            <p>{message}</p>
            {note && (
              <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--accent-success)' }}>{note}</p>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={submitting}
            id="confirm-dialog-btn"
          >
            {submitting ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
