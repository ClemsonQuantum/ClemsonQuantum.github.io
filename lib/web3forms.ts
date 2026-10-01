import siteConfig from '@/data/site-config.json';

// True when data/site-config.json carries a real Web3Forms access key rather
// than the placeholder. ContactForm and ModalFormButton both branch on this.
export const web3formsReady =
  Boolean(siteConfig.web3formsKey) &&
  siteConfig.web3formsKey !== 'your-access-key';

// What both forms tell visitors. The error lines end in "email " because the
// form follows them with the club's address as a mailto link.
export const FORM_COPY = {
  sending: 'Sending…',
  failed: 'Your message didn’t go through. Please try again, or email ',
  offline: 'You seem to be offline. Please try again, or email ',
  notReady: 'This form isn’t configured yet. Please email ',
} as const;

/**
 * POST a form's fields to Web3Forms. Resolves to null when the message went
 * through, or to the FORM_COPY line to show. Web3Forms' own error message is
 * logged rather than shown: it's written for the site's developer ("Invalid
 * access key"), not for visitors.
 */
export async function submitWeb3Form(
  data: FormData,
  subject: string,
  fromName: string,
): Promise<string | null> {
  data.append('access_key', siteConfig.web3formsKey);
  data.append('subject', subject);
  data.append('from_name', fromName);

  let res: Response;
  try {
    res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: data });
  } catch {
    return FORM_COPY.offline;
  }
  try {
    const json = await res.json();
    if (json.success) return null;
    console.warn('[web3forms]', json.message);
  } catch {
    console.warn('[web3forms] Unreadable response, HTTP', res.status);
  }
  return FORM_COPY.failed;
}
