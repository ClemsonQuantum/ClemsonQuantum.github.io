'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import siteConfig from '@/data/site-config.json';
import { FORM_COPY, submitWeb3Form, web3formsReady } from '@/lib/web3forms';

const SUBJECT = 'New message from the Clemson Quantum Club website';

type Status = 'idle' | 'submitting' | 'success' | 'error';

// The same three fields in both the Web3Forms and the mailto form.
const fields = (
  <>
    <label htmlFor="gi-name">Name</label>
    <input id="gi-name" type="text" name="name" autoComplete="name" required />

    <label htmlFor="gi-email">Email</label>
    <input id="gi-email" type="email" name="email" autoComplete="email" required />

    <label htmlFor="gi-message">Message</label>
    <textarea id="gi-message" name="message" rows={5} required />
  </>
);

// With a configured Web3Forms access key, submit via AJAX to Web3Forms.
// Without one, fall back to a mailto: submission.
export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus('submitting');
    setErrorMsg('');

    const error = await submitWeb3Form(new FormData(form), SUBJECT, 'Clemson Quantum Club website');
    if (error) {
      setStatus('error');
      setErrorMsg(error);
    } else {
      setStatus('success');
      form.reset();
    }
  }

  if (status === 'success') {
    return (
      // Replacing the form unmounts the focused submit button; parking focus
      // here keeps keyboard users oriented and announces the result (same
      // pattern as ModalFormButton).
      <p
        className="form-success"
        role="status"
        tabIndex={-1}
        ref={(el) => el?.focus()}
      >
        Message sent. We’ll reply to the email address you gave us.
      </p>
    );
  }

  // No key configured: mailto fallback.
  if (!web3formsReady) {
    return (
      <>
        <form
          action={`mailto:${siteConfig.contactEmail}?subject=${encodeURIComponent(
            SUBJECT
          )}`}
          method="post"
          encType="text/plain"
        >
          {fields}

          <button type="submit">Send message</button>
        </form>
        <p className="form-note">
          Pressing send opens your email app with your message ready to send to{' '}
          <a href={`mailto:${siteConfig.contactEmail}`}>
            {siteConfig.contactEmail}
          </a>
          .
        </p>
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {fields}

      {/* Honeypot: bots tick this hidden box; Web3Forms drops those submissions. */}
      <input type="checkbox" name="botcheck" hidden tabIndex={-1} />

      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? FORM_COPY.sending : 'Send message'}
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
  );
}
