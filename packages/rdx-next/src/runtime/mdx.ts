import { compileMDX } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'

export function compileDocumentation(
  source: string,
  components: Parameters<typeof compileMDX>[0]['components']
) {
  return compileMDX({
    source,
    components,
    options: {
      blockJS: true,
      blockDangerousJS: true,
      mdxOptions: { remarkPlugins: [remarkGfm] },
    },
  })
}
