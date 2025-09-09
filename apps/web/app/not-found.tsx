'use client'

import Link from 'next/link'
import { Button } from '@rdx/ui/components/button'

import { useVersion } from '@/hooks/use-version'

export default function NotFound() {
  const { version } = useVersion()
  const href = `/docs/${version}`

  return (
    <section className="bg-transparent text-primary h-full flex items-center justify-center cursor-default">
      <div className="w-1/2">
        <h1 className="text-9xl font-bold font-mono text-center">404</h1>
        <article className="flex flex-col gap-y-5">
          <p className="text-3xl font-bold font-mono text-center">
            Página não encontrada
          </p>
          <p className="text-sm ">Não encontramos o que você está procuando</p>
          <p className="text-sm">
            Por favor, entre em contato com o responsável pelo site que te levou
            ao link original e avise que o link está quebrado.
          </p>
          <Button variant="primary" asChild>
            <Link href={href}>Voltar para documentação</Link>
          </Button>
        </article>
      </div>
    </section>
  )
}
