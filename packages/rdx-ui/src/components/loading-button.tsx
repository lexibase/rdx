'use client'

import { useMessages } from '../providers/locale-provider'
import { Spline } from 'lucide-react'
import { Button } from '@lexibase/rdx-ui/components/button'

export function LoadingButton() {
  const messages = useMessages()
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-[134px] px-9 overflow-hidden"
      disabled
      aria-busy="true"
      aria-label={messages.loadingVersions}
    >
      <div className="animate-spin flex items-center justify-center">
        <Spline className="size-4" />
      </div>
    </Button>
  )
}
