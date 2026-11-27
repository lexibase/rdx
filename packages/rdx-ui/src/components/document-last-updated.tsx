import { formatMessage, getMessages } from '../lib/i18n'

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
  const format = (locale: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(value)
  let formatted: string
  try {
    // Dates follow the page language; an invalid tag falls back to English.
    formatted = format(lang ?? 'en')
  } catch {
    formatted = format('en')
  }

  return (
    <p className="mb-4 w-full text-sm text-muted-foreground md:mx-auto md:max-w-[860px]">
      <time dateTime={date}>
        {formatMessage(getMessages(lang).lastUpdated, { date: formatted })}
      </time>
    </p>
  )
}
