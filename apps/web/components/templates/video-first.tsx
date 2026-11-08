import { Button } from '@lexibase/rdx/ui/components/button'
import { HomeSection, HomeSections } from '@lexibase/rdx/ui/components/home'

// Put your video in public/videos/ and update these paths. The poster is optional.
const video = '/videos/atlas-walkthrough.webm'
const poster = '/videos/atlas-walkthrough-poster.webp'

const steps = [
  {
    title: 'Define a route',
    description:
      'Choose a URL path and decide what the API should return when someone opens it.',
  },
  {
    title: 'Start the server',
    description:
      'Run the project locally. The server listens on port 3000 and waits for a request.',
  },
  {
    title: 'Read the response',
    description:
      'Open the route in your browser and check that the greeting comes back as JSON.',
  },
]

export default function VideoFirst() {
  return (
    <HomeSections>
      <HomeSection aria-labelledby="video-hero-title">
        <div className="mx-auto w-full max-w-4xl">
          <header className="mx-auto mb-6 max-w-xl text-center sm:mb-8">
            <h1
              id="video-hero-title"
              className="text-4xl font-semibold tracking-tight sm:text-5xl"
            >
              See Atlas in action.
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Watch a request go from the editor to a working API.
            </p>
          </header>
          <video
            aria-label="Atlas API walkthrough"
            className="aspect-video w-full rounded-xl border border-border bg-muted"
            controls
            playsInline
            preload="none"
            src={video}
            poster={poster}
          />
        </div>
      </HomeSection>
      <HomeSection
        aria-labelledby="video-walkthrough-title"
        className="border-t border-border bg-muted/20"
      >
        <div className="mx-auto w-full max-w-4xl">
          <h2
            id="video-walkthrough-title"
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            From route to response.
          </h2>
          <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
            Follow the three actions shown in the walkthrough.
          </p>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {steps.map(({ title, description }, index) => (
              <li key={title} className="border-t border-border pt-4">
                <span
                  aria-hidden="true"
                  className="font-mono text-xs text-muted-foreground"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-2 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </HomeSection>
      <HomeSection
        aria-labelledby="video-use-cases-title"
        className="border-t border-border"
      >
        <div className="mx-auto w-full max-w-4xl">
          <h2
            id="video-use-cases-title"
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            One response, two ways to use it.
          </h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <figure className="min-w-0">
              <div
                aria-hidden="true"
                className="overflow-hidden rounded-xl border border-border bg-muted/20 font-mono text-xs"
              >
                <div className="border-b border-border px-4 py-2 text-muted-foreground">
                  localhost:3000
                </div>
                <div className="px-4 py-5 break-all">
                  {'{"message":"Hello from Atlas!"}'}
                </div>
              </div>
              <figcaption className="mt-4">
                <h3 className="font-semibold">Check it in the browser</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Open the local URL to see the response body and confirm the
                  route returns your greeting.
                </p>
              </figcaption>
            </figure>
            <figure className="min-w-0">
              <div
                aria-hidden="true"
                className="overflow-hidden rounded-xl border border-border bg-muted/20 font-mono text-xs"
              >
                <div className="border-b border-border px-4 py-2 text-muted-foreground">
                  200 OK
                </div>
                <div className="px-4 py-5 break-all">response.message</div>
              </div>
              <figcaption className="mt-4">
                <h3 className="font-semibold">Use it in a frontend</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Read the message field from the JSON response and show it in
                  your own interface.
                </p>
              </figcaption>
            </figure>
          </div>
        </div>
      </HomeSection>
      <HomeSection
        aria-labelledby="video-quickstart-title"
        className="border-t border-border bg-muted/20"
      >
        <div className="mx-auto max-w-xl text-center">
          <h2
            id="video-quickstart-title"
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Try it yourself.
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Follow the setup guide, create your first endpoint, and send a
            request of your own.
          </p>
          <Button href="/docs" variant="default" className="mt-6">
            Open the docs
          </Button>
        </div>
      </HomeSection>
    </HomeSections>
  )
}
