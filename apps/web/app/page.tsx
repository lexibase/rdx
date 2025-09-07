import { Button } from '@mdxrenderdocs/ui/components/button'
import { Separator } from '@mdxrenderdocs/ui/components/separator'

export default function Home() {
  return (
    <div className="bg-black text-white h-screen p-2">
      <Button variant="destructive" size="lg">
        Senta aqui no colinho vai
      </Button>
      <Separator className="my-4" />
      <Separator orientation="vertical" className="mx-4" />
    </div>
  )
}
