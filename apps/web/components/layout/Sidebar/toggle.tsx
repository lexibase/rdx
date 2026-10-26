'use client'

import { useMessages } from '@lexibase/rdx-ui/providers/locale-provider'
import { Button } from '@lexibase/rdx-ui/components/button'
import { SidebarOpen } from 'lucide-react'

type Props = {
  onToggle: () => void
}

export function SidebarToggle({ onToggle }: Props) {
  const messages = useMessages()
  return (
    <div className="md:hidden absolute top-2 left-4 z-50">
      <Button
        variant="ghost"
        onClick={onToggle}
        aria-label={messages.openSidebar}
      >
        <SidebarOpen className="size-4" />
      </Button>
    </div>
  )
}
