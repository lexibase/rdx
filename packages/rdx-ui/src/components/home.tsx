import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

import { cn } from '../lib/utils'
import { Button } from './button'
import { Logo } from './logo'

/** Gives each HomeSection the height of the visible homepage area. */
export function HomeSections({ children }: { children: ReactNode }) {
  return <div className="relative h-full">{children}</div>
}

/** A homepage section that fills the viewport and grows with its content. */
export function HomeSection({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<'section'>) {
  return (
    <section
      className={cn('grid min-h-full content-center px-6 py-12', className)}
      {...props}
    >
      {children}
    </section>
  )
}

/** The responsive hero layout used by the official site and project homepages. */
export function HomeHeroLayout({
  intro,
  preview,
  details,
  previewInert,
  previewProps,
  ...props
}: Omit<ComponentPropsWithoutRef<'section'>, 'children' | 'className'> & {
  intro: ReactNode
  preview: ReactNode
  details?: ReactNode
  previewInert?: boolean
  previewProps?: Pick<
    ComponentPropsWithoutRef<'div'>,
    'className' | 'onPointerMove' | 'onPointerLeave' | 'onPointerCancel'
  >
}) {
  const { className: previewClassName, ...previewEvents } = previewProps ?? {}

  return (
    <section
      className="rdx-home-stage mx-auto grid w-full max-w-[1440px] content-center items-center gap-8 px-6 py-10 md:px-10 md:py-20 lg:min-h-[calc(100svh-3rem)] lg:grid-cols-[0.8fr_1.2fr] lg:gap-x-12 lg:gap-y-5"
      {...props}
    >
      <div className="rdx-home-copy min-w-0">{intro}</div>
      <div
        className={cn(
          'rdx-home-preview-shell min-w-0 lg:col-start-2 lg:row-start-1',
          details && 'lg:row-span-2',
          previewClassName
        )}
        inert={previewInert}
        aria-hidden={previewInert || undefined}
        {...previewEvents}
      >
        {preview}
      </div>
      {details && (
        <div className="rdx-home-css min-w-0 lg:col-start-1 lg:row-start-2">
          {details}
        </div>
      )}
    </section>
  )
}

export function HomePreviewFrame({
  caption,
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<'div'> & { caption: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-2xl shadow-black/10',
        className
      )}
      {...props}
    >
      <div className="flex h-10 items-center gap-1.5 border-b border-border bg-muted/30 px-4">
        <span className="size-2 rounded-full bg-muted-foreground/30" />
        <span className="size-2 rounded-full bg-muted-foreground/30" />
        <span className="size-2 rounded-full bg-muted-foreground/30" />
        <span className="mx-auto truncate pr-8 text-[10px] text-muted-foreground">
          {caption}
        </span>
      </div>
      {children}
    </div>
  )
}

/** The built-in homepage with project branding. */
export function Home({
  title = 'RDX',
  logo,
  description,
  buttons = [],
  preview,
  previewTitle = title,
  previewDescription,
  children,
}: {
  title?: string
  logo?: ReactNode
  description?: string
  buttons?: { label: string; href: string; className?: string }[]
  preview?: ReactNode
  previewTitle?: string
  previewDescription?: string
  children?: ReactNode
}) {
  return (
    <HomeSections>
      <HomeSection data-rdx-home className="min-h-full overflow-x-clip p-0">
        <HomeHeroLayout
          previewInert
          intro={
            <>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight wrap-break-word sm:text-4xl lg:text-6xl lg:leading-none">
                {title}
              </h1>
              {description && (
                <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground lg:mt-6 lg:text-base lg:leading-7">
                  {description}
                </p>
              )}
              {buttons.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3 lg:mt-7">
                  {buttons.map((button, index) => (
                    <Button
                      key={`${index}:${button.href}`}
                      variant={index === 0 ? 'default' : 'outline'}
                      href={button.href}
                      className={button.className}
                    >
                      {button.label} {index === 0 && <ArrowRight />}
                    </Button>
                  ))}
                </div>
              )}
            </>
          }
          preview={
            preview ?? (
              <HomePreviewFrame caption={title}>
                <div className="flex items-center gap-2 border-b border-border px-5 py-3 text-sm font-semibold">
                  {logo ?? <Logo className="size-5" />}
                  {title}
                </div>
                <div className="flex min-h-72">
                  <div className="w-36 shrink-0 border-r border-border p-3">
                    <p className="rounded-md bg-accent px-2 py-1.5 text-xs font-medium text-accent-foreground">
                      {previewTitle}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1 wrap-break-word p-7">
                    <p className="text-2xl font-semibold tracking-tight">
                      {previewTitle}
                    </p>
                    {previewDescription && (
                      <p className="mt-4 text-sm leading-6 text-muted-foreground">
                        {previewDescription}
                      </p>
                    )}
                  </div>
                </div>
              </HomePreviewFrame>
            )
          }
        />
      </HomeSection>
      {children}
    </HomeSections>
  )
}
