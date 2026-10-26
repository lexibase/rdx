import { getMessages } from '../lib/i18n'
import { Button } from './button'

/** The development website's 404 layout, shared with generated projects. */
export function NotFound({
  href = '/docs',
  lang,
}: {
  href?: string
  lang?: string
}) {
  const messages = getMessages(lang)

  return (
    <main
      id="rdx-main"
      data-rdx-not-found
      tabIndex={-1}
      className="bg-transparent text-primary h-full min-h-0 w-full flex flex-1 items-center justify-center cursor-default p-7 outline-none"
    >
      <div className="w-full md:w-1/2">
        <h1 className="text-9xl font-bold font-mono text-center">404</h1>
        <article className="flex flex-col gap-y-5">
          <p className="text-3xl font-bold font-mono text-center">
            {messages.notFound}
          </p>
          <p className="text-sm">{messages.notFoundDescription}</p>
          <p className="text-sm">{messages.brokenLink}</p>
          <Button variant="primary" href={href}>
            {messages.backToDocs}
          </Button>
        </article>
      </div>
    </main>
  )
}
