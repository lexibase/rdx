import type { RdxTranslatedHomepageProps } from '@lexibase/rdx'
import { Button } from '@lexibase/rdx/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@lexibase/rdx/ui/components/card'
import { HomeSection } from '@lexibase/rdx/ui/components/home'

// Add your video and optional poster to public/videos/, then update these paths.
const project = {
  name: 'Atlas',
  video: '/videos/atlas-walkthrough.webm',
  poster: '/videos/atlas-walkthrough-poster.webp',
}

const primaryAction =
  'border border-rdx-selected/30 bg-rdx-selected/15 text-foreground hover:bg-rdx-selected/25'

function AtlasMark({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
    >
      <path
        d="M5 38 20 9h8l15 29H32l-3-7H19l-3 7H5Z"
        fill="currentColor"
        opacity=".4"
      />
      <path d="m24 9 15 29h-9l-6-14-6 14H9L24 9Z" fill="currentColor" />
      <path d="M20 32h8l3 6H17l3-6Z" fill="currentColor" opacity=".65" />
    </svg>
  )
}

export default function VideoFirst({
  docsHref = '/docs',
  t = (phrase) => phrase,
}: Partial<RdxTranslatedHomepageProps>) {
  const features = [
    {
      title: t('Start with one route'),
      description: t('Give your API a URL and decide what it should return.'),
      label: t('Route'),
      example: 'GET /',
    },
    {
      title: t('Return structured data'),
      description: t('Send a JSON response your browser or frontend can read.'),
      label: t('Response body'),
      example: '{ "message": "Hello from Atlas!" }',
    },
    {
      title: t('Work locally'),
      description: t(
        'Try a change in your editor and send another request from your browser.'
      ),
      label: t('Local server'),
      example: 'localhost:3000',
    },
    {
      title: t('Check the result'),
      description: t(
        'Use the status code to see whether the request succeeded.'
      ),
      label: t('HTTP status'),
      example: '200 OK',
    },
    {
      title: t('Try it from a terminal'),
      description: t(
        'Use curl to inspect the response without leaving the command line.'
      ),
      label: t('Request'),
      example: 'curl http://localhost:3000/',
    },
    {
      title: t('Connect your frontend'),
      description: t(
        'Read the message field and render the greeting in your interface.'
      ),
      label: t('In your app'),
      example: 'data.message',
    },
  ]
  const steps = [
    {
      title: t('Define a route'),
      description: t('Choose a URL path and give it a JSON response.'),
    },
    {
      title: t('Start the server'),
      description: t(
        'Run your project locally and let it listen on port 3000.'
      ),
    },
    {
      title: t('Send a request'),
      description: t('Open the URL and check the greeting in the response.'),
    },
  ]
  const requirements = [
    t('Node.js 22 or 24'),
    'TypeScript',
    t('Browser or curl'),
  ]

  return (
    <div className="text-foreground">
      <HomeSection
        aria-labelledby="video-hero-title"
        className="min-h-0 pt-16 pb-0 sm:pt-24"
      >
        <div className="mx-auto w-full max-w-4xl">
          <header className="mx-auto max-w-xl text-center">
            <AtlasMark className="mx-auto size-16 text-rdx-selected" />
            <h1
              id="video-hero-title"
              className="mt-5 text-5xl font-semibold tracking-tight sm:text-6xl"
            >
              {project.name}
            </h1>
            <p className="mt-3 text-lg text-foreground/80 sm:text-xl">
              {t('See your API come to life.')}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {t(
                'Go from a route in your editor to a JSON response in your browser. Follow the walkthrough and make the example your own.'
              )}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                href="#video-setup-title"
                variant="default"
                className={primaryAction}
              >
                {t('Get started')}
              </Button>
              <Button href={docsHref} variant="outline">
                {t('Read the docs')}
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {t('TypeScript example · Runs locally')}
            </p>
          </header>

          <video
            id="atlas-walkthrough"
            aria-label={t('Atlas API walkthrough')}
            className="mt-10 aspect-video w-full rounded-xl border border-border bg-muted shadow-xl shadow-black/10 dark:shadow-black/30"
            controls
            playsInline
            preload="none"
            src={project.video}
            poster={project.poster}
          />
        </div>
      </HomeSection>

      <HomeSection
        aria-labelledby="video-features-title"
        className="min-h-0 py-16 sm:py-24"
      >
        <div className="mx-auto w-full max-w-6xl">
          <header className="mx-auto max-w-xl text-center">
            <h2
              id="video-features-title"
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              {t('A small API, from end to end.')}
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              {t(
                'See what changes between the route you write, the request you send, and the data you get back.'
              )}
            </p>
          </header>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ title, description, label, example }) => (
              <li key={example}>
                <Card className="h-full gap-4">
                  <CardHeader className="flex-1">
                    <h3 className="font-semibold">{title}</h3>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border border-border bg-muted/50 px-3 py-2.5">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <code className="mt-1 block text-xs leading-5 wrap-anywhere text-rdx-selected">
                        {example}
                      </code>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </HomeSection>

      <HomeSection
        aria-labelledby="video-setup-title"
        className="min-h-0 pt-0 pb-16 sm:pb-24"
      >
        <div className="mx-auto w-full max-w-5xl">
          <h2
            id="video-setup-title"
            className="scroll-mt-6 text-center text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {t('Running in three steps.')}
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map(({ title, description }, index) => (
              <li key={index} className="rounded-xl border border-border p-5">
                <span
                  aria-hidden="true"
                  className="grid size-8 place-items-center rounded-full bg-rdx-selected/15 text-sm font-semibold"
                >
                  {index + 1}
                </span>
                <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-4 text-center">
            <Button
              href={docsHref}
              variant="link"
              className="text-rdx-selected"
            >
              {t('Read the setup guide')} <span aria-hidden="true">→</span>
            </Button>
          </div>
        </div>
      </HomeSection>

      <HomeSection
        aria-labelledby="video-next-title"
        className="min-h-0 pt-0 pb-16 text-center sm:pb-24"
      >
        <div className="mx-auto w-full max-w-xl">
          <ul
            aria-label={t('Requirements')}
            className="mb-12 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
          >
            {requirements.map((requirement, index) => (
              <li key={index}>{requirement}</li>
            ))}
          </ul>
          <h2
            id="video-next-title"
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {t('Ready to make your first request?')}
          </h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            {t(
              'Use the walkthrough as a starting point for your own endpoint.'
            )}
          </p>
          <Button
            href={docsHref}
            variant="default"
            className={`mt-6 ${primaryAction}`}
          >
            {t('Start building')}
          </Button>
        </div>
      </HomeSection>

      <footer className="border-t border-border px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AtlasMark className="size-8 shrink-0 text-rdx-selected" />
            <div>
              <p className="text-sm font-semibold">{project.name}</p>
              <p className="text-xs text-muted-foreground">
                {t('A sample project for learning how HTTP APIs work.')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button href={docsHref} variant="link" size="sm">
              {t('Docs')}
            </Button>
            <Button href="#atlas-walkthrough" variant="link" size="sm">
              {t('Walkthrough')}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
