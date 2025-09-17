'use client'

import Link from 'next/link'
import { Button } from '@rdx/ui/components/button'

import { useVersion } from '@/hooks/use-version'

export default function NotFound() {
  const { version } = useVersion()
  const href = `/docs/${version}`

  return (
    <section className="bg-transparent text-primary h-full flex items-center justify-center cursor-default">
      <div className="w-1/2">
        <h1 className="text-9xl font-bold font-mono text-center">404</h1>
        <article className="flex flex-col gap-y-5">
          <p className="text-3xl font-bold font-mono text-center">
            Page not Found
          </p>
          <p className="text-sm ">
            We couldn&apos;t find what you were looking for.
          </p>
          <p className="text-sm">
            Please contact the owner of the site that led you to this link and
            let them know the link is broken.
          </p>
          <Button variant="primary" asChild>
            <Link href={href}>Go back to documentation</Link>
          </Button>
        </article>
      </div>
    </section>
  )
}
