import { Separator } from '@rdx/ui/components/separator'

export const mdxComponents: Record<string, React.ComponentType<any>> = {
  h1: (props) => <h1 className="text-4xl font-bold my-6" {...props} />,
  h2: (props) => <h2 className="text-2xl font-bold my-6" {...props} />,
  h3: (props) => <h3 className="text-xl font-bold my-6" {...props} />,
  p: (props) => <p className="my-4" {...props} />,
  ul: (props) => <ul className="list-disc my-4 ml-6" {...props} />,
  li: (props) => <li className="my-2 before:mr-2" {...props} />,
  a: (props) => <a className="underline text-chart-1" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="bg-secondary text-muted-foreground border-l-2 pl-4 py-px my-2"
      {...props}
    />
  ),
  pre: (props) => (
    <pre
      className="bg-secondary text-secondary-foreground rounded-md p-4 my-4 overflow-x-auto"
      {...props}
    />
  ),
  code: (props) => (
    <code
      className="bg-secondary text-secondary-foreground rounded-sm px-1 py-0.5"
      {...props}
    />
  ),

  // Custom
  Separator: (props) => <Separator className="my-8" {...props} />,
}
