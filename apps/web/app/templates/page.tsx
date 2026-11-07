import type { Metadata } from 'next'

const description =
  'Explore landing page templates and make one your own in RDX.'

export const metadata: Metadata = {
  title: 'Templates',
  description,
}

export default function TemplatesPage() {
  return (
    <main
      id="rdx-main"
      tabIndex={-1}
      className="relative min-h-0 flex-1 overflow-y-auto outline-none"
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-14 md:px-10 md:py-20">
        <header className="max-w-xl">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Templates
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {description}
          </p>
        </header>
      </div>
    </main>
  )
}
