'use client'

import { useRef, useState } from 'react'
import { Button } from '@lexibase/rdx-ui/components/button'
import { ButtonLink } from '@lexibase/rdx-ui/components/button-link'
import { Separator } from '@lexibase/rdx-ui/components/separator'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@lexibase/rdx-ui/components/dropdown-menu'

export default function BaseUiHome() {
  const [checked, setChecked] = useState(false)
  const [value, setValue] = useState('one')
  const [action, setAction] = useState('none')
  const button = useRef<HTMLButtonElement>(null)
  return (
    <main>
      <h1>Project owned homepage</h1>
      <ButtonLink href="/docs/init/intro" variant="outline">
        Documentation link
      </ButtonLink>
      <Button disabled onClick={() => setAction('disabled clicked')}>
        Disabled button
      </Button>
      <Separator decorative={false} orientation="vertical" />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              ref={button}
              variant="outline"
              className={(state) =>
                state.disabled ? 'opacity-50' : 'fixture-trigger'
              }
            />
          }
        >
          Primitive test menu
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Preferences</DropdownMenuLabel>
            <DropdownMenuItem
              disabled
              onClick={() => setAction('disabled clicked')}
            >
              Disabled item
            </DropdownMenuItem>
            <DropdownMenuCheckboxItem
              checked={checked}
              onCheckedChange={setChecked}
            >
              Show details
            </DropdownMenuCheckboxItem>
            <DropdownMenuRadioGroup value={value} onValueChange={setValue}>
              <DropdownMenuRadioItem value="one">
                First option
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="two">
                Second option
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More actions</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onClick={() =>
                    setAction(button.current?.tagName ?? 'missing ref')
                  }
                >
                  Run action
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <output aria-label="Primitive state">{`${checked}:${value}:${action}`}</output>
    </main>
  )
}
