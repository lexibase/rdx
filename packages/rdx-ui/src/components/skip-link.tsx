import { getMessages } from '../lib/i18n'

/** First keyboard stop, shared by the website and generated documentation. */
export function SkipLink({ lang }: { lang?: string }) {
  return (
    <a className="rdx-skip-link" href="#rdx-main">
      {getMessages(lang).skipContent}
    </a>
  )
}
