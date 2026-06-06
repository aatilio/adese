import React from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  icon: Icon,
  children,
  footer,
  overlayClass = "tp-modal-overlay--blurred",
  boxClass = "tp-modal-box",
  onSubmit,
}) {
  if (!isOpen) return null;

  const content = (
    <>
      <div className="tp-modal-header">
        <h3 className="tp-modal-header__title">
          {Icon && <Icon size={18} className="tp-modal-header__icon" />} {title}
        </h3>
        <button type="button" className="tp-modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {onSubmit ? (
        <form onSubmit={onSubmit}>
          <div className="tp-modal-body">{children}</div>
          {footer && <div className="tp-modal-footer">{footer}</div>}
        </form>
      ) : (
        <>
          <div className="tp-modal-body">{children}</div>
          {footer && <div className="tp-modal-footer">{footer}</div>}
        </>
      )}
    </>
  );

  return (
    <div className={overlayClass} onClick={onClose}>
      <div className={boxClass} onClick={e => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}
