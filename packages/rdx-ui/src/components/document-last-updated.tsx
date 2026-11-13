import { formatMessage, getMessages, resolveInterfaceLocale } from '../lib/i18n'

export function DocumentLastUpdated({
  date,
  lang,
}: {
  date?: string
  lang?: string
}) {
  if (!date) return null
  const value = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(value.getTime())) return null
  const formatted = new Intl.DateTimeFormat(resolveInterfaceLocale(lang), {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(value)

  return (
    <p className="mb-4 w-full text-sm text-muted-foreground md:mx-auto md:max-w-[860px]">
      <time dateTime={date}>
        {formatMessage(getMessages(lang).lastUpdated, { date: formatted })}
      </time>
    </p>
  )
}
