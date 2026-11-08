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
  tagline: 'See your API come to life.',
  description:
    'Go from a route in your editor to a JSON response in your browser. Follow the walkthrough and make the example your own.',
  docsHref: '/docs',
  video: '/videos/atlas-walkthrough.webm',
  poster: '/videos/atlas-walkthrough-poster.webp',
}

const features = [
  {
    title: 'Start with one route',
    description: 'Give your API a URL and decide what it should return.',
    label: 'Route',
    example: 'GET /',
  },
  {
    title: 'Return structured data',
    description: 'Send a JSON response your browser or frontend can read.',
    label: 'Response body',
    example: '{ "message": "Hello from Atlas!" }',
  },
  {
    title: 'Work locally',
    description:
      'Try a change in your editor and send another request from your browser.',
    label: 'Local server',
    example: 'localhost:3000',
  },
  {
    title: 'Check the result',
    description: 'Use the status code to see whether the request succeeded.',
    label: 'HTTP status',
    example: '200 OK',
  },
  {
    title: 'Try it from a terminal',
    description:
      'Use curl to inspect the response without leaving the command line.',
    label: 'Request',
    example: 'curl http://localhost:3000/',
  },
  {
    title: 'Connect your frontend',
    description:
      'Read the message field and render the greeting in your interface.',
    label: 'In your app',
    example: 'data.message',
  },
]

const steps = [
  {
    title: 'Define a route',
    description: 'Choose a URL path and give it a JSON response.',
  },
  {
    title: 'Start the server',
    description: 'Run your project locally and let it listen on port 3000.',
  },
  {
    title: 'Send a request',
    description: 'Open the URL and check the greeting in the response.',
  },
]

const requirements = ['Node.js 22 or 24', 'TypeScript', 'Browser or curl']

const primaryAction =
  'bg-sky-500 text-slate-950 hover:bg-sky-400 dark:bg-sky-400 dark:hover:bg-sky-300'

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

export default function VideoFirst() {
  return (
    <div className="text-foreground">
      <HomeSection
        aria-labelledby="video-hero-title"
        className="min-h-0 pt-16 pb-0 sm:pt-24"
      >
        <div className="mx-auto w-full max-w-4xl">
          <header className="mx-auto max-w-xl text-center">
            <AtlasMark className="mx-auto size-16 text-sky-600 dark:text-sky-400" />
            <h1
              id="video-hero-title"
              className="mt-5 text-5xl font-semibold tracking-tight sm:text-6xl"
            >
              {project.name}
            </h1>
            <p className="mt-3 text-lg text-foreground/80 sm:text-xl">
              {project.tagline}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {project.description}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                href="#video-setup-title"
                variant="default"
                className={primaryAction}
              >
                Get started
              </Button>
              <Button href={project.docsHref} variant="outline">
                Read the docs
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              TypeScript example · Runs locally
            </p>
          </header>

          <video
            id="atlas-walkthrough"
            aria-label="Atlas API walkthrough"
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
              A small API, from end to end.
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              See what changes between the route you write, the request you
              send, and the data you get back.
            </p>
          </header>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ title, description, label, example }) => (
              <li key={title}>
                <Card className="h-full gap-4">
                  <CardHeader className="flex-1">
                    <h3 className="font-semibold">{title}</h3>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border border-border bg-muted/50 px-3 py-2.5">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <code className="mt-1 block text-xs leading-5 wrap-anywhere text-sky-700 dark:text-sky-300">
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
            Running in three steps.
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map(({ title, description }, index) => (
              <li key={title} className="rounded-xl border border-border p-5">
                <span
                  aria-hidden="true"
                  className="grid size-8 place-items-center rounded-full bg-sky-500 text-sm font-semibold text-slate-950 dark:bg-sky-400"
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
              href={project.docsHref}
              variant="link"
              className="text-sky-700 dark:text-sky-300"
            >
              Read the setup guide <span aria-hidden="true">→</span>
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
            aria-label="Requirements"
            className="mb-12 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
          >
            {requirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
          <h2
            id="video-next-title"
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Ready to make your first request?
          </h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            Use the walkthrough as a starting point for your own endpoint.
          </p>
          <Button
            href={project.docsHref}
            variant="default"
            className={`mt-6 ${primaryAction}`}
          >
            Start building
          </Button>
        </div>
      </HomeSection>

      <footer className="border-t border-border px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AtlasMark className="size-8 shrink-0 text-sky-600 dark:text-sky-400" />
            <div>
              <p className="text-sm font-semibold">{project.name}</p>
              <p className="text-xs text-muted-foreground">
                A sample project for learning how HTTP APIs work.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button href={project.docsHref} variant="link" size="sm">
              Docs
            </Button>
            <Button href="#atlas-walkthrough" variant="link" size="sm">
              Walkthrough
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
