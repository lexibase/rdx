'use client'

import { motion, useReducedMotion } from 'motion/react'
import { Children, useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/utils'
import { formatMessage } from '../lib/i18n'
import { useMessages } from '../providers/locale-provider'
import { Button } from './button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './card'

function StepPanel({
  children,
  active,
}: {
  children: ReactNode
  active: boolean
}) {
  const panel = useRef<HTMLDivElement>(null)
  const wasActive = useRef(active)

  useEffect(() => {
    if (active && !wasActive.current)
      panel.current?.focus({ preventScroll: true })
    wasActive.current = active
  }, [active])

  return (
    <div
      ref={panel}
      data-slot="step-panel"
      tabIndex={-1}
      inert={!active}
      aria-hidden={!active || undefined}
      className="min-w-0 shrink-0 basis-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </div>
  )
}

export function Steps({ children }: { children: ReactNode }) {
  const messages = useMessages()
  const reduceMotion = useReducedMotion()
  const steps = Children.toArray(children)
  const [page, setPage] = useState(0)
  const index = Math.min(page, steps.length - 1)
  if (index < 0) return null

  function navigate(direction: number) {
    setPage((current) =>
      Math.max(
        0,
        Math.min(
          Math.min(current, steps.length - 1) + direction,
          steps.length - 1
        )
      )
    )
  }

  return (
    <Card
      className="mx-auto my-6 w-full min-w-0 max-w-xl text-base"
      data-slot="steps"
    >
      <CardHeader>
        <div aria-hidden="true" className="flex gap-1.5">
          {steps.map((_, position) => (
            <span
              key={position}
              className={cn(
                'h-1.5 min-w-0 rounded-full motion-safe:transition-[flex-basis,background-color] motion-safe:duration-200',
                position === index
                  ? 'basis-10 bg-rdx-selected'
                  : 'basis-2.5 bg-muted-foreground/25'
              )}
            />
          ))}
        </div>
        <p
          role="status"
          className="m-0 mt-2 text-sm font-medium text-muted-foreground"
        >
          {formatMessage(messages.stepProgress, {
            current: String(index + 1),
            total: String(steps.length),
          })}
        </p>
      </CardHeader>
      <CardContent className="min-w-0">
        <div className="min-h-32 overflow-clip">
          <motion.div
            className="flex items-start"
            initial={false}
            animate={{ x: `${-index * 100}%` }}
            transition={{
              duration: reduceMotion ? 0 : 0.24,
              ease: 'easeInOut',
            }}
          >
            {steps.map((step, position) => (
              <StepPanel key={position} active={position === index}>
                {step}
              </StepPanel>
            ))}
          </motion.div>
        </div>
      </CardContent>
      {steps.length > 1 && (
        <CardFooter className="justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={index === 0}
            onClick={() => navigate(-1)}
          >
            {messages.previous}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={index === steps.length - 1}
            onClick={() => navigate(1)}
          >
            {messages.next}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

export function Step({ children }: { children: ReactNode }) {
  return <div className="min-w-0 [&>:last-child]:mb-0">{children}</div>
}

export function StepTitle({ children }: { children: ReactNode }) {
  return <CardTitle className="text-lg font-semibold">{children}</CardTitle>
}
