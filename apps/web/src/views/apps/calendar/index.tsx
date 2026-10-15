'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// Third-party Imports
import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  isSameMonth,
  startOfWeek,
  subMonths,
  subWeeks
} from 'date-fns'
import { CalendarCheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from 'lucide-react'

// Type Imports
import type { CalendarView } from '@/types/apps/calendar-types'

// Component Imports
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { DayView } from './day-view'
import { MonthView } from './month-view'
import { WeekView } from './week-view'

// Util Imports
import { cn } from '@/lib/utils'

// Data Imports
import { EventGap, EventHeight, WeekCellsHeight } from '@/assets/data/constants'
import { db } from '@/fake-db/apps/calendar'

export interface EventCalendarProps {
  className?: string
  initialView?: CalendarView
}

export function EventCalendar({ className, initialView = 'month' }: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [view, setView] = useState<CalendarView>(initialView)

  const goToToday = () => setCurrentDate(new Date())

  const goToPrevious = () => {
    setCurrentDate(current => {
      if (view === 'month') return subMonths(current, 1)
      if (view === 'week') return subWeeks(current, 1)

      return addDays(current, -1)
    })
  }

  const goToNext = () => {
    setCurrentDate(current => {
      if (view === 'month') return addMonths(current, 1)
      if (view === 'week') return addWeeks(current, 1)

      return addDays(current, 1)
    })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return
      }

      switch (e.key.toLowerCase()) {
        case 'm':
          setView('month')
          break
        case 'w':
          setView('week')
          break
        case 'd':
          setView('day')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const viewTitle = useMemo(() => {
    if (view === 'month') {
      return format(currentDate, 'MMMM yyyy')
    } else if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 })
      const end = endOfWeek(currentDate, { weekStartsOn: 0 })

      if (isSameMonth(start, end)) {
        return format(start, 'MMMM yyyy')
      } else {
        return `${format(start, 'MMM')} - ${format(end, 'MMM yyyy')}`
      }
    } else if (view === 'day') {
      return (
        <>
          <span className='min-[480px]:hidden' aria-hidden='true'>
            {format(currentDate, 'MMM d, yyyy')}
          </span>
          <span className='max-[479px]:hidden md:hidden' aria-hidden='true'>
            {format(currentDate, 'MMMM d, yyyy')}
          </span>
          <span className='max-md:hidden'>{format(currentDate, 'EEE MMMM d, yyyy')}</span>
        </>
      )
    } else {
      return format(currentDate, 'MMMM yyyy')
    }
  }, [currentDate, view])

  return (
    <div className='bg-card flex flex-col rounded-lg border'>
      <div
        className='flex flex-col has-data-[slot=month-view]:flex-1'
        style={
          {
            '--event-height': `${EventHeight}px`,
            '--event-gap': `${EventGap}px`,
            '--week-cells-height': `${WeekCellsHeight}px`
          } as React.CSSProperties
        }
      >
        <div className={cn('flex items-center justify-between gap-1 p-2 sm:p-4', className)}>
          <div className='flex items-center gap-1 max-sm:justify-between sm:gap-4'>
            <div className='flex items-center gap-1'>
              <Button className='max-sm:hidden md:max-lg:h-8'>
                <PlusIcon size={16} aria-hidden='true' />
                <span>New event</span>
              </Button>
              <Button size='icon-sm' className='sm:hidden'>
                <PlusIcon size={16} aria-hidden='true' />
              </Button>
              <Button variant='outline' className='max-sm:hidden md:max-lg:h-8' onClick={goToToday}>
                <CalendarCheckIcon size={16} aria-hidden='true' />
                <span>Today</span>
              </Button>
              <Button variant='outline' size='icon-sm' className='sm:hidden' onClick={goToToday}>
                <CalendarCheckIcon size={16} aria-hidden='true' />
              </Button>
            </div>
          </div>
          <div className='flex items-center gap-1'>
            <Button variant='ghost' size='icon-sm' onClick={goToPrevious} aria-label='Previous'>
              <ChevronLeftIcon size={16} aria-hidden='true' />
            </Button>
            <h2 className='text-sm font-semibold sm:text-lg md:text-xl'>{viewTitle}</h2>
            <Button variant='ghost' size='icon-sm' onClick={goToNext} aria-label='Next'>
              <ChevronRightIcon size={16} aria-hidden='true' />
            </Button>
          </div>
          <div className='flex items-center gap-2'>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant='outline' className='max-sm:h-8!' />}>
                <span>
                  <span className='sm:hidden' aria-hidden='true'>
                    {view.charAt(0).toUpperCase()}
                  </span>
                  <span className='max-sm:sr-only'>{view.charAt(0).toUpperCase() + view.slice(1)}</span>
                </span>
                <ChevronDownIcon className='-me-1 opacity-60' size={16} aria-hidden='true' />
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='min-w-32'>
                <DropdownMenuItem onClick={() => setView('month')}>
                  Month <DropdownMenuShortcut>M</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView('week')}>
                  Week <DropdownMenuShortcut>W</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView('day')}>
                  Day <DropdownMenuShortcut>D</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className='flex flex-1 flex-col'>
          {view === 'month' && (
            <MonthView currentDate={currentDate} events={db} onEventSelect={() => {}} onEventCreate={() => {}} />
          )}
          {view === 'week' && (
            <WeekView currentDate={currentDate} events={db} onEventSelect={() => {}} onEventCreate={() => {}} />
          )}
          {view === 'day' && (
            <DayView currentDate={currentDate} events={db} onEventSelect={() => {}} onEventCreate={() => {}} />
          )}
        </div>
      </div>
    </div>
  )
}
