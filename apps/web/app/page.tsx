import { Logo } from '@rdx/ui/components/logo'

export default function Home() {
  return (
    <section className="w-full h-full flex flex-col items-center justify-center">
      <Logo className="size-52 hover:scale-105 hover:rotate-1 transition-[scale, rotation] duration-1000" />
      <span className="text-3xl font-mono uppercase">RenderDocX</span>
    </section>
  )
}
