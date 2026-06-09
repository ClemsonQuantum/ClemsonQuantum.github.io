'use client';

import { Fragment, useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import siteConfig from '@/data/site-config.json';

// A button that opens an in-page modal ("bubble") form instead of a mailto:
// link, so the visitor never leaves the page or launches their mail app.
// Submits via Web3Forms (same service as the contact form). Reused for both
// the participant-updates and sponsorship forms — only the copy/fields differ.
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
  successMessage,
  submitLabel = 'Submit',
  fields,
}: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const uid = useId();

  // While open: focus the first field, close on Escape, and lock background scroll.
  useEffect(() => {
    if (!open) return;
    dialogRef.current
      ?.querySelector<HTMLElement>('input:not([type="checkbox"]), textarea')
      ?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  function openModal() {
    setStatus('idle');
    setErrorMsg('');
    setOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!web3formsReady) {
      setStatus('error');
      setErrorMsg('This form isn’t configured yet —');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    const data = new FormData(form);
    data.append('access_key', siteConfig.web3formsKey);
    data.append('subject', subject);
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
        setErrorMsg(json.message || 'Something went wrong —');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error —');
    }
  }

  return (
    <>
      <button type="button" className="view-all-link" onClick={openModal}>
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
              <p className="form-success" role="status">
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
                      {errorMsg} email us at{' '}
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
