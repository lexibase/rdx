import { Button } from '@rdx/ui/components/button'
import { SidebarOpen } from 'lucide-react'

type Props = {
  onToggle: () => void
}

export function SidebarToggle({ onToggle }: Props) {
  return (
    <div className="md:hidden absolute top-2 left-4 z-50">
      <Button
        variant="ghost"
        onClick={onToggle}
        aria-label="Toggle Mode Button"
      >
        <SidebarOpen className="size-4" />
      </Button>
    </div>
  )
}
