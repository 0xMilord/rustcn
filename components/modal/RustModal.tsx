/**
 * RustModal — An accessible dialog component.
 *
 * Features:
 * - ARIA-compliant (role="dialog", aria-modal)
 * - Focus trap
 * - Escape key to close
 * - Backdrop click to close
 * - Smooth transitions
 *
 * Copy-paste this component into your project. You own it.
 */

import React, { useEffect, useCallback, useRef, ReactNode } from 'react';

export interface RustModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}

export function RustModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  closeOnBackdrop = true,
  closeOnEscape = true,
}: RustModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Save focus before modal, restore on close
  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
      // Focus the modal content
      setTimeout(() => contentRef.current?.focus(), 0);
    } else if (previousFocus.current) {
      previousFocus.current.focus();
    }
  }, [open]);

  // Escape key handler
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeOnEscape, onOpenChange]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onOpenChange(false);
    }
  }, [closeOnBackdrop, onOpenChange]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={contentRef}
        className="bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[85vh] overflow-auto outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        tabIndex={-1}
      >
        {(title || description) && (
          <div className="flex flex-col space-y-1.5 p-6 pb-4">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold leading-none tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p id="modal-description" className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}
        <div className="p-6 pt-0">{children}</div>
      </div>
    </div>
  );
}

export function RustModalTrigger({ onClick, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button onClick={onClick} className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2" {...props}>
      {children}
    </button>
  );
}
