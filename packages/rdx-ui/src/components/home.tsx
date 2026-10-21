import type { ReactNode } from 'react'
import Link from 'next/link'

import { Button } from './button'
import { Logo } from './logo'

/** The default landing page from apps/web, not a separate marketing theme. */
export function Home({
  title = 'RDX',
  logo,
  description,
  buttons = [],
}: {
  title?: string
  logo?: ReactNode
  description?: string
  buttons?: { label: string; href: string }[]
}) {
  return (
    <section
      data-rdx-home
      className="w-full h-full flex flex-col items-center justify-center"
    >
      {logo ?? (
        <Logo className="size-52 hover:scale-105 hover:rotate-1 transition-[scale,rotation] duration-1000" />
      )}
      <span className="text-3xl font-mono uppercase">{title}</span>
      {description && (
        <p className="text-sm text-muted-foreground text-center max-w-xl mt-4 px-6">
          {description}
        </p>
      )}
      {buttons.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3 mt-6 px-6">
          {buttons.map((button, index) => (
            <Button
              key={`${index}:${button.href}`}
              variant={index === 0 ? 'default' : 'outline'}
              asChild
            >
              <Link href={button.href}>{button.label}</Link>
            </Button>
          ))}
        </div>
      )}
    </section>
  )
}
