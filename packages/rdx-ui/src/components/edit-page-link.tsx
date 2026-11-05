import { Pencil } from 'lucide-react'

import { getMessages } from '../lib/i18n'
import { Button } from './button'

export function EditPageLink({ href, lang }: { href: string; lang?: string }) {
  const messages = getMessages(lang)
  return (
    <Button
      variant="link"
      size="link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-4 self-start text-sm text-muted-foreground hover:text-foreground"
    >
      <Pencil aria-hidden="true" className="me-1.5 inline size-3.5" />
      {messages.editThisPage}
      <span className="sr-only"> ({messages.opensInNewTab})</span>
    </Button>
  )
}
