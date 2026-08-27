'use client';

import { Fragment, useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import siteConfig from '@/data/site-config.json';

// Button that opens an in-page modal form and submits via Web3Forms.
// Shared by the participant-updates and sponsorship forms; copy/fields differ per use.
const web3formsReady =
  Boolean(siteConfig.web3formsKey) &&
  siteConfig.web3formsKey !== 'your-access-key';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export interface ModalFormField {
  name: string;
  label: string;
  type?: 'text' | 'email';
  required?: boolean;
  multiline?: boolean;
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
}

function autoCompleteFor(field: ModalFormField): string {
  if (field.type === 'email') return 'email';
  if (field.name === 'name') return 'name';
  if (field.name === 'organization') return 'organization';
  return 'off';
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
      ?.querySelector<HTMLElement>('input:not([type="checkbox"]), textarea')
      ?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      // Visible controls only — offsetParent is null for the display:none
      // honeypot, and tabIndex -1 skips anything deliberately unfocusable.
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, textarea, select',
        ),
      ).filter((el) => el.tabIndex !== -1 && el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialog.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
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
      setErrorMsg('This form isn’t configured yet.');
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
    data.append('access_key', siteConfig.web3formsKey);
    data.append('subject', composedSubject);
    data.append('from_name', subject);

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: data,
      });
      const json = await res.json();
      if (json.success) {
        setStatus('success');
        form.reset();
      } else {
        setStatus('error');
        setErrorMsg(json.message || 'Something went wrong.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error.');
    }
  }

  return (
    <>
      <button
        type="button"
        className="view-all-link"
        aria-haspopup="dialog"
        onClick={openModal}
      >
        {label}
      </button>

      {open && (
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
                <h3 id={`${uid}-title`} className="modal-title">
                  {title}
                </h3>
                <p className="modal-subtitle">{subtitle}</p>
                <form className="modal-form" onSubmit={handleSubmit}>
                  {fields.map((field) => {
                    const id = `${uid}-${field.name}`;
                    return (
                      <Fragment key={field.name}>
                        <label htmlFor={id}>{field.label}</label>
                        {field.multiline ? (
                          <textarea
                            id={id}
                            name={field.name}
                            rows={4}
                            required={field.required}
                          />
                        ) : (
                          <input
                            id={id}
                            type={field.type ?? 'text'}
                            name={field.name}
                            required={field.required}
                            autoComplete={autoCompleteFor(field)}
                          />
                        )}
                      </Fragment>
                    );
                  })}

                  {/* Honeypot — bots fill this hidden field; Web3Forms drops them. */}
                  <input
                    type="checkbox"
                    name="botcheck"
                    style={{ display: 'none' }}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                  />

                  <button
                    type="submit"
                    className="hackathon-cta"
                    disabled={status === 'submitting'}
                  >
                    {status === 'submitting' ? 'Submitting…' : submitLabel}
                  </button>

                  {status === 'error' && (
                    <p className="form-error" role="alert">
                      {errorMsg} Please email us at{' '}
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
        </div>
      )}
    </>
  );
}
