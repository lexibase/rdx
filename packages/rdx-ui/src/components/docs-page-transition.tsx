'use client'

import { useEffect, ViewTransition, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const directions = {
  'rdx-doc-forward': 'rdx-doc-forward',
  'rdx-doc-back': 'rdx-doc-back',
  default: 'none',
}

const interactive = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'label',
  'summary',
  'dialog',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="button"]',
  '[role="slider"]',
  '[role="textbox"]',
  '[role="combobox"]',
  '[draggable="true"]',
  'pre',
  'table',
  'img',
  'video',
  'audio',
  'canvas',
  'iframe',
  '[data-rdx-code-block]',
  '[data-slot="table-container"]',
  '[data-slot="tabs"]',
  '[data-rdx-mermaid-preview]',
].join(',')

/** Let the router retain ownership of navigation, focus and history. */
export function DocsPageTransition({
  children,
  previousHref,
  nextHref,
}: {
  children: ReactNode
  previousHref?: string
  nextHref?: string
}) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>(
      '[data-rdx-docs-scroll]'
    )
    if (!scroller) return
    let gesture: {
      id: number
      x: number
      y: number
      top: number
      time: number
    } | null = null
    let navigationAt = -Infinity
    const selected = () => window.getSelection()?.isCollapsed === false
    const cancel = () => {
      gesture = null
    }
    const start = (event: TouchEvent) => {
      cancel()
      if (
        event.defaultPrevented ||
        window.innerWidth >= 768 ||
        event.touches.length !== 1 ||
        selected()
      )
        return
      const target = event.target
      if (!(target instanceof Element) || target.closest(interactive)) return
      // Leave nested horizontal scrollers to their own gestures, including custom MDX.
      for (
        let element: Element | null = target;
        element && element !== scroller;
        element = element.parentElement
      ) {
        if (
          element.scrollWidth > element.clientWidth + 1 &&
          /auto|scroll/.test(getComputedStyle(element).overflowX)
        )
          return
      }
      const touch = event.touches[0]!
      // Keep browser/system edge gestures available.
      if (touch.clientX < 32 || touch.clientX > window.innerWidth - 32) return
      gesture = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        top: scroller.scrollTop,
        time: performance.now(),
      }
    }
    const move = (event: TouchEvent) => {
      if (event.defaultPrevented) return cancel()
      if (!gesture) return
      const touch = event.touches[0]
      if (
        event.touches.length !== 1 ||
        !touch ||
        touch.identifier !== gesture.id
      )
        return cancel()
      const dx = Math.abs(touch.clientX - gesture.x)
      const dy = Math.abs(touch.clientY - gesture.y)
      if (dy > 12 && dy >= dx) cancel()
    }
    const end = (event: TouchEvent) => {
      const current = gesture
      cancel()
      if (
        !current ||
        event.touches.length ||
        selected() ||
        window.innerWidth >= 768
      )
        return
      const touch = Array.from(event.changedTouches).find(
        (entry) => entry.identifier === current.id
      )
      if (!touch) return
      const dx = touch.clientX - current.x
      const dy = touch.clientY - current.y
      const now = performance.now()
      if (
        now - current.time > 1000 ||
        now - navigationAt < 450 ||
        Math.abs(scroller.scrollTop - current.top) > 8
      )
        return
      if (
        Math.abs(dx) < Math.min(120, Math.max(64, window.innerWidth * 0.18)) ||
        Math.abs(dx) < Math.abs(dy) * 1.5
      )
        return
      const href = dx < 0 ? nextHref : previousHref
      if (!href) return
      navigationAt = now
      router.push(href, {
        transitionTypes: [dx < 0 ? 'rdx-doc-forward' : 'rdx-doc-back'],
      })
    }
    // Passive listeners never take scrolling, zooming or selection away from the browser.
    scroller.addEventListener('touchstart', start, { passive: true })
    scroller.addEventListener('touchmove', move, { passive: true })
    scroller.addEventListener('touchend', end, { passive: true })
    scroller.addEventListener('touchcancel', cancel, { passive: true })
    return () => {
      scroller.removeEventListener('touchstart', start)
      scroller.removeEventListener('touchmove', move)
      scroller.removeEventListener('touchend', end)
      scroller.removeEventListener('touchcancel', cancel)
    }
  }, [pathname, previousHref, nextHref, router])

  return (
    <ViewTransition
      name="rdx-document"
      default="none"
      enter={directions}
      exit={directions}
      update={directions}
      share={directions}
    >
      {children}
    </ViewTransition>
  )
}
