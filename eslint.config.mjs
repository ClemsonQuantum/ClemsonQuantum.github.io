// eslint-config-next 16 ships native flat configs, so the FlatCompat
// shim (which broke against the v16 export shape) is no longer needed.
import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const eslintConfig = [
  { ignores: ['.next/**', 'out/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  ...typescript,
];

export default eslintConfig;
