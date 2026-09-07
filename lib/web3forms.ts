import siteConfig from '@/data/site-config.json';

// True when data/site-config.json carries a real Web3Forms access key rather
// than the placeholder. ContactForm and ModalFormButton both branch on this.
export const web3formsReady =
  Boolean(siteConfig.web3formsKey) &&
  siteConfig.web3formsKey !== 'your-access-key';
