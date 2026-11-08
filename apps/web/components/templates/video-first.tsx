import { Button } from '@lexibase/rdx/ui/components/button'
import { HomeSection, HomeSections } from '@lexibase/rdx/ui/components/home'

// Put your video in public/videos/ and update these paths. The poster is optional.
const video = '/videos/atlas-walkthrough.webm'
const poster = '/videos/atlas-walkthrough-poster.webp'

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
        aria-labelledby="video-quickstart-title"
        className="border-t border-border bg-muted/20"
      >
        <div className="mx-auto w-full max-w-4xl">
          <h2
            id="video-quickstart-title"
            className="text-3xl font-semibold tracking-tight"
          >
            Try it yourself.
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            Create a route, start the server, then open the route in your
            browser. The example returns a JSON greeting.
          </p>
          <Button href="/docs" variant="default" className="mt-5">
            Open the docs
          </Button>
        </div>
      </HomeSection>
    </HomeSections>
  )
}
