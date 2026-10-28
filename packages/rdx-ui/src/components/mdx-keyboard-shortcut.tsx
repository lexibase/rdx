import type { ReactNode } from 'react'

import { getMessages, type InterfaceMessages } from '../lib/i18n'
import { Kbd, KbdGroup } from './kbd'

const keyNames: Record<string, keyof InterfaceMessages> = {
  ctrl: 'keyboardControl',
  control: 'keyboardControl',
  '⌃': 'keyboardControl',
  shift: 'keyboardShift',
  '⇧': 'keyboardShift',
  alt: 'keyboardAlt',
  cmd: 'keyboardCommand',
  command: 'keyboardCommand',
  '⌘': 'keyboardCommand',
  option: 'keyboardOption',
  '⌥': 'keyboardOption',
  esc: 'keyboardEscape',
  escape: 'keyboardEscape',
  '⎋': 'keyboardEscape',
  enter: 'keyboardEnter',
  return: 'keyboardEnter',
  '↵': 'keyboardEnter',
  '⏎': 'keyboardEnter',
  space: 'keyboardSpace',
  spacebar: 'keyboardSpace',
  '+': 'keyboardPlus',
  arrowup: 'keyboardArrowUp',
  '↑': 'keyboardArrowUp',
  arrowdown: 'keyboardArrowDown',
  '↓': 'keyboardArrowDown',
  arrowleft: 'keyboardArrowLeft',
  '←': 'keyboardArrowLeft',
  arrowright: 'keyboardArrowRight',
  '→': 'keyboardArrowRight',
}

/** Markdown adapter: preserve shadcn visuals, expose one readable text alternative. */
export function MdxKeyboardShortcut({
  children,
  lang,
}: {
  children?: ReactNode
  lang?: string
}) {
  if (typeof children !== 'string') return <Kbd>{children}</Kbd>
  const keys = children
    .trim()
    .split(/\s+\+\s+/)
    .map((key) => key.trim())
  if (keys.length < 2 || keys.some((key) => !key)) return <Kbd>{children}</Kbd>
  const messages = getMessages(lang)
  const description = keys
    .map((key) => {
      const name = Object.hasOwn(keyNames, key.toLowerCase())
        ? keyNames[key.toLowerCase()]
        : undefined
      return name ? messages[name] : key
    })
    .join(messages.keyboardJoiner)
  return (
    <span data-rdx-kbd-value={children} className="inline-flex align-baseline">
      <span className="sr-only select-none">{description}</span>
      <KbdGroup aria-hidden="true">
        {keys.map((key, index) => (
          <span key={index} className="inline-flex items-center gap-1">
            {index > 0 && <span>+</span>}
            <Kbd>{key}</Kbd>
          </span>
        ))}
      </KbdGroup>
    </span>
  )
}
