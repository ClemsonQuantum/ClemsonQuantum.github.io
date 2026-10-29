import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const eslintConfig = [
  { ignores: ['.next/**', 'out/**', 'next-env.d.ts', 'curriculum/.venv/**'] },
  ...coreWebVitals,
  ...typescript,
];

export default eslintConfig;
