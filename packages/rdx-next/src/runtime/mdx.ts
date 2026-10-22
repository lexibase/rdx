import { compileMDX } from 'next-mdx-remote/rsc'

export function compileDocumentation(
  source: string,
  components: Parameters<typeof compileMDX>[0]['components']
) {
  return compileMDX({
    source,
    components,
    options: { blockJS: true, blockDangerousJS: true },
  })
}
