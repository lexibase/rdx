import type { Metadata } from 'next'
import type { RDXConfig } from '@lexibase/rdx-types'

/** Translate the shared configuration through Next's native Metadata API. */
export function getRdxMetadata(config: RDXConfig): Metadata {
  const { metadataBase, ...metadata } = config.metadata
  const name = metadata.applicationName
  return {
    title: { default: name, template: `%s | ${name}` },
    description: config.description,
    ...metadata,
    ...(metadataBase ? { metadataBase: new URL(metadataBase) } : {}),
    ...(metadata.openGraph
      ? {
          openGraph: {
            title: name,
            description: config.description,
            ...metadata.openGraph,
          },
        }
      : {}),
    ...(metadata.twitter
      ? {
          twitter: {
            title: name,
            description: config.description,
            ...metadata.twitter,
          },
        }
      : {}),
  }
}
