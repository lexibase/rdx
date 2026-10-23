import type { Metadata } from 'next'
import type { RdxConfig } from '@lexibase/rdx-types'

/** Translate the shared configuration through Next's native Metadata API. */
export function getRdxMetadata(config: RdxConfig): Metadata {
  const { metadataBase, ...metadata } = config.metadata ?? {}
  return {
    title: { default: config.title, template: `%s | ${config.title}` },
    description: config.description,
    ...metadata,
    ...(metadataBase ? { metadataBase: new URL(metadataBase) } : {}),
    ...(metadata.openGraph
      ? {
          openGraph: {
            title: config.title,
            description: config.description,
            ...metadata.openGraph,
          },
        }
      : {}),
    ...(metadata.twitter
      ? {
          twitter: {
            title: config.title,
            description: config.description,
            ...metadata.twitter,
          },
        }
      : {}),
  }
}
