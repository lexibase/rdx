type Mermaid = (typeof import('mermaid'))['default']

let engine: Promise<Mermaid> | undefined
let queue: Promise<unknown> = Promise.resolve()
let serial = 0

function loadMermaid() {
  engine ??= import('mermaid')
    .then((module) => module.default)
    .catch((error: unknown) => {
      engine = undefined
      throw error
    })
  return engine
}

/** Mermaid owns global configuration: serialize theme setup and rendering. */
export function renderMermaid(
  source: string,
  dark: boolean,
  active: () => boolean
): Promise<string | undefined> {
  const task = queue.then(async () => {
    if (!active()) return
    if (source.length > 50_000)
      throw new Error('Mermaid definition exceeds 50,000 characters.')
    const mermaid = await loadMermaid()
    if (!active()) return
    const fontFamily = 'ui-sans-serif, system-ui, sans-serif'
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      htmlLabels: false,
      maxTextSize: 50_000,
      maxEdges: 500,
      theme: 'base',
      fontFamily,
      themeVariables: {
        fontSize: '14px',
        darkMode: dark,
        background: 'transparent',
        primaryColor: dark ? '#18181b' : '#f4f4f5',
        primaryTextColor: dark ? '#fafafa' : '#18181b',
        primaryBorderColor: dark ? '#52525b' : '#a1a1aa',
        lineColor: dark ? '#a1a1aa' : '#52525b',
        secondaryColor: dark ? '#27272a' : '#e4e4e7',
        tertiaryColor: dark ? '#18181b' : '#fafafa',
        fontFamily,
      },
      // Diagram directives cannot change the site's safety, theme or limits.
      secure: [
        ...new Set([
          'secure',
          'securityLevel',
          'startOnLoad',
          'maxTextSize',
          'maxEdges',
          'suppressErrorRendering',
          'theme',
          'flowchart',
          'htmlLabels',
          'dompurifyConfig',
          'themeCSS',
          'themeVariables',
          'fontFamily',
        ]),
      ],
    })
    const container = document.createElement('div')
    container.setAttribute('aria-hidden', 'true')
    container.inert = true
    Object.assign(container.style, {
      position: 'fixed',
      left: '-100000px',
      visibility: 'hidden',
    })
    document.body.append(container)
    try {
      const { svg } = await mermaid.render(
        `rdx-mermaid-${++serial}`,
        source,
        container
      )
      if (!active()) return
      // Mermaid's responsive width is intended for inline SVG. Give the image
      // intrinsic dimensions so preview scaling and the expanded view stay crisp.
      const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
      const element = document.documentElement
      if (element.localName !== 'svg')
        throw new Error('Mermaid returned invalid SVG.')
      const viewBox = element
        .getAttribute('viewBox')
        ?.split(/[\s,]+/)
        .map(Number)
      if (
        viewBox?.length === 4 &&
        viewBox.every(Number.isFinite) &&
        viewBox[2]! > 0 &&
        viewBox[3]! > 0
      ) {
        element.setAttribute('width', String(viewBox[2]))
        element.setAttribute('height', String(viewBox[3]))
        element.style.removeProperty('max-width')
      }
      return new XMLSerializer().serializeToString(element)
    } finally {
      container.remove()
    }
  })
  // A failed diagram must not block other diagrams on this or the next page.
  queue = task.catch(() => undefined)
  return task
}
