import rehypeShiki from '@shikijs/rehype'

/** shadcn's Shiki/GitHub palette, applied to MDX on the server. */
export function rehypeDocumentationCode(
  this: ThisParameterType<typeof rehypeShiki>
): ReturnType<typeof rehypeShiki> {
  return rehypeShiki.call(this, {
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
    addLanguageClass: true,
    // Load grammars only when a document uses them, not the whole bundle.
    langs: [],
    lazy: true,
    fallbackLanguage: 'text',
    // The copy button must retain MDX's original trailing newline.
    stripEndNewline: false,
    inline: false,
  })
}
