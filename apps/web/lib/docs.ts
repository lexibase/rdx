import versions from '../versions.json'

import { createDocumentation } from './documentation'

export const documentation = createDocumentation(process.cwd(), versions)
export const docsIndexer = documentation.categories
