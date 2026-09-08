import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  labelledBy: string;
  wide?: boolean;
}

export function Modal({ onClose, children, labelledBy, wide = false }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`modal ${wide ? 'modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        ref={ref}
        tabIndex={-1}
      >
        <button type="button" className="modal__close" onClick={onClose} aria-label="Close dialog">
          ×
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}
