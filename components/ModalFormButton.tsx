'use client';

import { Fragment, useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import siteConfig from '@/data/site-config.json';
import { FORM_COPY, submitWeb3Form, web3formsReady } from '@/lib/web3forms';

// Button that opens an in-page modal form and submits via Web3Forms.
// Generic modal form; MarkdownLink configures copy and fields per use.
type Status = 'idle' | 'submitting' | 'success' | 'error';

export interface ModalFormField {
  name: string;
  label: string;
  type?: 'text' | 'email';
  required?: boolean;
}

interface Props {
  label?: ReactNode;
  title: string;
  subtitle: string;
  subject: string;
  /** Optional email-subject template; `{fieldName}` tokens are replaced with
   *  submitted values (e.g. "{name} has requested participant updates").
   *  Falls back to `subject` when omitted. */
  subjectTemplate?: string;
  successMessage: string;
  submitLabel?: string;
  fields: ModalFormField[];
  /** Trigger classes; defaults to the inline text-link look. */
  className?: string;
}

export default function ModalFormButton({
  label,
  title,
  subtitle,
  subject,
  subjectTemplate,
  successMessage,
  submitLabel = 'Submit',
  fields,
  className = 'view-all-link',
}: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const uid = useId();

  // While open: focus the first field, keep Tab cycling inside the dialog,
  // close on Escape, and lock background scroll. Cleanup runs on every close
  // path (Escape, X, overlay click, unmount) and hands focus back to the
  // button that opened the modal.
  useEffect(() => {
    if (!open) return;
    dialogRef.current
      ?.querySelector<HTMLElement>('input:not([type="checkbox"])')
      ?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      // Visible controls only: offsetParent is null for the hidden honeypot,
      // and tabIndex -1 skips anything deliberately unfocusable.
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, textarea, select',
        ),
      ).filter((el) => el.tabIndex !== -1 && el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      // -1 when focus is outside the dialog or on something that isn't one of
      // its controls (the success message parks focus on a tabIndex -1 <p>),
      // so Tab still wraps instead of escaping to the page behind.
      const index = focusables.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey) {
        if (index <= 0) {
          e.preventDefault();
          last.focus();
        }
      } else if (index === -1 || index === focusables.length - 1) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    // Lock the root, not body: html's overflow is not visible (overflow-x:
    // clip), so body's value would not reach the viewport, the page would
    // keep scrolling, and body would become a scroll container that captures
    // every sticky element and scroll-driven animation while the modal is open.
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      root.style.overflow = prevOverflow;
      triggerRef.current?.focus();
      triggerRef.current = null;
    };
  }, [open]);

  function openModal() {
    // Remember the opener so the cleanup above can restore focus to it.
    triggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setStatus('idle');
    setErrorMsg('');
    setOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!web3formsReady) {
      setStatus('error');
      setErrorMsg(FORM_COPY.notReady);
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    const data = new FormData(form);
    // Personalize the subject (Web3Forms renders it as the email's headline)
    // by filling `{fieldName}` tokens from what the visitor submitted.
    const composedSubject = subjectTemplate
      ? subjectTemplate.replace(/\{(\w+)\}/g, (_, key) =>
          String(data.get(key) ?? '').trim(),
        )
      : subject;
    const error = await submitWeb3Form(data, composedSubject, subject);
    if (error) {
      setStatus('error');
      setErrorMsg(error);
    } else {
      setStatus('success');
      form.reset();
    }
  }

  return (
    <>
      <button
        type="button"
        className={className}
        aria-haspopup="dialog"
        onClick={openModal}
      >
        {label}
      </button>

      {open &&
        createPortal(
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="modal-bubble"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${uid}-title`}
            ref={dialogRef}
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              &times;
            </button>

            {/* Always rendered so aria-labelledby keeps naming the dialog;
                visually hidden once the form is replaced by the success note. */}
            <h3
              id={`${uid}-title`}
              className={`modal-title${status === 'success' ? ' sr-only' : ''}`}
            >
              {title}
            </h3>

            {status === 'success' ? (
              // Replacing the form drops the focused submit button from the
              // DOM; parking focus on the status keeps keyboard users inside
              // the dialog and announces the result.
              <p
                className="form-success"
                role="status"
                tabIndex={-1}
                ref={(el) => el?.focus()}
              >
                {successMessage}
              </p>
            ) : (
              <>
                <p className="modal-subtitle">{subtitle}</p>
                <form className="modal-form" onSubmit={handleSubmit}>
                  {fields.map((field) => {
                    const id = `${uid}-${field.name}`;
                    return (
                      <Fragment key={field.name}>
                        <label htmlFor={id}>{field.label}</label>
                        <input
                          id={id}
                          type={field.type ?? 'text'}
                          name={field.name}
                          required={field.required}
                          autoComplete={field.type === 'email' ? 'email' : field.name === 'name' ? 'name' : 'off'}
                        />
                      </Fragment>
                    );
                  })}

                  {/* Honeypot: bots tick this hidden box; Web3Forms drops those submissions. */}
                  <input type="checkbox" name="botcheck" hidden tabIndex={-1} />

                  <button
                    type="submit"
                    className="hackathon-cta"
                    disabled={status === 'submitting'}
                  >
                    {status === 'submitting' ? FORM_COPY.sending : submitLabel}
                  </button>

                  {status === 'error' && (
                    <p className="form-error" role="alert">
                      {errorMsg}
                      <a href={`mailto:${siteConfig.contactEmail}`}>
                        {siteConfig.contactEmail}
                      </a>
                      .
                    </p>
                  )}
                </form>
              </>
            )}
          </div>
        </div>,
        document.body,
        )}
    </>
  );
}
