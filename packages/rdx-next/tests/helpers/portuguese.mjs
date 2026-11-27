// RDX ships English interface text only. Tests that check translated labels
// register a generated pt-BR catalog, as a project's _labels.json would: each
// text gets a visible prefix, so no translation is stored in the repository.
import { createJiti } from 'jiti'

const { interfaceTexts } = await createJiti(import.meta.url).import(
  '../../../rdx-ui/src/lib/i18n.ts'
)

/** The generated translation of an English interface text. */
export const pt = (text) => `PT-BR ${text}`

export const portugueseLabels = Object.fromEntries(
  interfaceTexts.map((text) => [text, pt(text)])
)

/** Register the catalog in the rdx-ui module the given jiti instance loads. */
export async function registerPortuguese(jiti) {
  const { registerInterfaceLabels } = await jiti.import(
    '../../rdx-ui/src/lib/i18n.ts'
  )
  registerInterfaceLabels('pt-BR', portugueseLabels)
}
