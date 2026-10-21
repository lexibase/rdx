import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    [require.resolve('@tailwindcss/postcss')]: {},
  },
}

export default config
