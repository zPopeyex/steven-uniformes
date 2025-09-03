import React, { useEffect, useRef } from "react";

/**
 * ModalBase
 * Reusable modal container aligned with app's existing modal styles.
 *
 * Props:
 * - isOpen: boolean
 * - title?: string
 * - onClose: () => void
 * - children: React.ReactNode
 * - footer?: React.ReactNode
 */
export default function ModalBase({ isOpen, title, onClose, children, footer }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Tab" && containerRef.current) {
        // basic focus trap within modal content
        const focusable = containerRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // prevent background scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 720 }}
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
      >
        <div className="modal-header">
          <h2 id="modal-title" style={{ margin: 0 }}>{title}</h2>
          <button className="btn btn-sm btn-secondary" aria-label="Cerrar" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">{footer}</div>
      </div>
    </div>
  );
}

