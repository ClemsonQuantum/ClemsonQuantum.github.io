'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import siteConfig from '@/data/site-config.json';

// With a configured Web3Forms access key, submit via AJAX to Web3Forms.
// Without one, fall back to a mailto: submission.
const web3formsReady =
  Boolean(siteConfig.web3formsKey) &&
  siteConfig.web3formsKey !== 'your-access-key';

const SUBJECT = 'New message from the Clemson Quantum Club website';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus('submitting');
    setErrorMsg('');

    const data = new FormData(form);
    data.append('access_key', siteConfig.web3formsKey);
    data.append('subject', SUBJECT);
    data.append('from_name', 'Clemson Quantum Club website');

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
        setErrorMsg(json.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error — please try again or email us directly.');
    }
  }

  if (status === 'success') {
    return (
      <p className="form-success" role="status">
        Thanks for reaching out! Your message was sent — we&apos;ll get back to
        you within a few days.
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
          <label htmlFor="gi-name">Name</label>
          <input id="gi-name" type="text" name="name" autoComplete="name" required />

          <label htmlFor="gi-email">Email</label>
          <input id="gi-email" type="email" name="email" autoComplete="email" required />

          <label htmlFor="gi-message">Message</label>
          <textarea id="gi-message" name="message" rows={5} required />

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
      <label htmlFor="gi-name">Name</label>
      <input id="gi-name" type="text" name="name" autoComplete="name" required />

      <label htmlFor="gi-email">Email</label>
      <input id="gi-email" type="email" name="email" autoComplete="email" required />

      <label htmlFor="gi-message">Message</label>
      <textarea id="gi-message" name="message" rows={5} required />

      {/* Honeypot — bots fill this hidden field; Web3Forms drops those submissions. */}
      <input
        type="checkbox"
        name="botcheck"
        className="visually-hidden"
        style={{ display: 'none' }}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending…' : 'Send message'}
      </button>

      {status === 'error' && (
        <p className="form-error" role="alert">
          {errorMsg} You can also email{' '}
          <a href={`mailto:${siteConfig.contactEmail}`}>
            {siteConfig.contactEmail}
          </a>
          .
        </p>
      )}
    </form>
  );
}
