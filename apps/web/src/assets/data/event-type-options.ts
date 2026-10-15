import type { events } from '@/types/apps/calendar-types'

export type EventTypeOption = {
  value: events
  label: string
  bgClass: string
  borderClass: string
  dotClass: string
}

export const EVENT_TYPE_OPTIONS: EventTypeOption[] = [
  {
    value: 'family',
    label: 'Family',
    bgClass: 'data-checked:bg-amber-400 dark:data-checked:bg-amber-400',
    borderClass: 'data-checked:border-amber-400',
    dotClass: 'bg-amber-400'
  },
  {
    value: 'business',
    label: 'Business',
    bgClass: 'data-checked:bg-violet-400 dark:data-checked:bg-violet-400',
    borderClass: 'data-checked:border-violet-400',
    dotClass: 'bg-violet-400'
  },
  {
    value: 'personal',
    label: 'Personal',
    bgClass: 'data-checked:bg-rose-400 dark:data-checked:bg-rose-400',
    borderClass: 'data-checked:border-rose-400',
    dotClass: 'bg-rose-400'
  },
  {
    value: 'holiday',
    label: 'Holiday',
    bgClass: 'data-checked:bg-emerald-400 dark:data-checked:bg-emerald-400',
    borderClass: 'data-checked:border-emerald-400',
    dotClass: 'bg-emerald-400'
  },
  {
    value: 'etc',
    label: 'Etc',
    bgClass: 'data-checked:bg-sky-400 dark:data-checked:bg-sky-400',
    borderClass: 'data-checked:border-sky-400',
    dotClass: 'bg-sky-400'
  }
]

export const EVENT_TYPE_DOT_CLASSES = Object.fromEntries(
  EVENT_TYPE_OPTIONS.map(option => [option.value, option.dotClass])
) as Record<events, string>

export const ALL_EVENT_TYPES = EVENT_TYPE_OPTIONS.map(option => option.value)
