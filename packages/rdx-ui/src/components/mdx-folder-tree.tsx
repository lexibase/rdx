import {
  File,
  FileCode2,
  FileImage,
  FileJson,
  FileText,
  Folder,
} from 'lucide-react'

import { CodeBlockLine } from './code-block'

function entryIcon(name: string) {
  if (name.endsWith('/')) return { Icon: Folder, kind: 'folder' }
  const extension = name.includes('.')
    ? name.split('.').at(-1)?.toLowerCase()
    : undefined
  if (extension === 'json' || extension === 'jsonc')
    return { Icon: FileJson, kind: 'json' }
  if (extension && /^(?:png|jpe?g|gif|webp|svg|avif|ico|bmp)$/.test(extension))
    return { Icon: FileImage, kind: 'image' }
  if (extension && /^(?:mdx?|txt|log|rst)$/.test(extension))
    return { Icon: FileText, kind: 'text' }
  if (
    extension &&
    /^(?:[cm]?[jt]sx?|html|css|scss|vue|svelte|py|rb|go|rs|java|c|cpp|h|cs|php|sql|sh|bash|ya?ml|toml)$/.test(
      extension
    )
  )
    return { Icon: FileCode2, kind: 'code' }
  return { Icon: File, kind: 'file' }
}

/** Decorate generated text with icons inside the official shadcn line component. */
export function MdxFolderTree({ value }: { value: string }) {
  const trailingNewline = value.endsWith('\n')
  const lines = value.replace(/\n$/, '').split('\n')
  return lines.map((line, index) => {
    const match = line.match(/^([ │\t]*(?:├──|└──)\s*)(.*)$/)
    const prefix = match?.[1] ?? line.match(/^[ │\t]*/)?.[0] ?? ''
    const name = match?.[2] ?? line.slice(prefix.length)
    const { Icon, kind } = entryIcon(name)
    return (
      <CodeBlockLine key={index} data-rdx-folder-kind={name ? kind : undefined}>
        {prefix && <span aria-hidden="true">{prefix}</span>}
        {name && (
          <>
            <Icon
              aria-hidden="true"
              className="mr-1.5 inline-block size-3.5 align-[-2px] text-muted-foreground"
            />
            {name}
          </>
        )}
        {index < lines.length - 1 || trailingNewline ? '\n' : null}
      </CodeBlockLine>
    )
  })
}
