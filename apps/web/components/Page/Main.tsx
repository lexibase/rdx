import { ReactNode } from 'react'

interface MainProps {
  children: ReactNode
}

export const Main = ({ children }: MainProps) => {
  return <main className="h-full w-full flex-1 max-w-[960px]">{children}</main>
}
