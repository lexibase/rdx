import { ViewTransition, type ReactNode } from 'react'

const directions = {
  'rdx-doc-forward': 'rdx-doc-forward',
  'rdx-doc-back': 'rdx-doc-back',
  default: 'none',
}

/** Let the router retain ownership of navigation, focus and history. */
export function DocsPageTransition({ children }: { children: ReactNode }) {
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
