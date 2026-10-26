'use client'

import { useMessages } from '@lexibase/rdx-ui/providers/locale-provider'
import { Button } from '@lexibase/rdx-ui/components/button'

import { useVersion } from '@/hooks/use-version'

export default function NotFound() {
  const messages = useMessages()
  const { version } = useVersion()
  const href = `/docs/${version}`

  return (
    <section className="bg-transparent text-primary h-full flex items-center justify-center cursor-default">
      <div className="w-1/2">
        <h1 className="text-9xl font-bold font-mono text-center">404</h1>
        <article className="flex flex-col gap-y-5">
          <p className="text-3xl font-bold font-mono text-center">
            {messages.notFound}
          </p>
          <p className="text-sm ">{messages.notFoundDescription}</p>
          <p className="text-sm">{messages.brokenLink}</p>
          <Button variant="primary" href={href}>
            {messages.backToDocs}
          </Button>
        </article>
      </div>
    </section>
  )
}
