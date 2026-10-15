// Third-party Imports
import { addDays, setHours, setMinutes, subDays } from 'date-fns'

// Type Imports
import type { CalendarEvent } from '@/types/apps/calendar-types'

export const db: CalendarEvent[] = [
  {
    id: '1',
    title: 'Matter strategy review',
    description: 'Review objectives and key procedural dates',
    start: subDays(new Date(), 24), // 24 days before today
    end: subDays(new Date(), 23), // 23 days before today
    allDay: true,
    color: 'etc',
    location: 'Conference Room A'
  },
  {
    id: '2',
    title: 'Disclosure deadline',
    description: 'Serve the agreed disclosure materials',
    start: setMinutes(setHours(subDays(new Date(), 9), 13), 0), // 1:00 PM, 9 days before
    end: setMinutes(setHours(subDays(new Date(), 9), 15), 30), // 3:30 PM, 9 days before
    color: 'family',
    location: 'Court filing portal'
  },
  {
    id: '3',
    title: 'Case status conference',
    description: 'Discuss scheduling and outstanding motions',
    start: subDays(new Date(), 13), // 13 days before today
    end: subDays(new Date(), 13), // 13 days before today
    allDay: true,
    color: 'family',
    location: 'County courthouse · Room 4'
  },
  {
    id: '4',
    title: 'Client intake review',
    description: 'Review intake notes and conflicts checklist',
    start: setMinutes(setHours(new Date(), 10), 0), // 10:00 AM today
    end: setMinutes(setHours(new Date(), 11), 0), // 11:00 AM today
    color: 'etc',
    location: 'Conference Room B'
  },
  {
    id: '5',
    title: 'Northstar client conference',
    description: 'Discuss transaction milestones and open questions',
    start: setMinutes(setHours(addDays(new Date(), 1), 12), 0), // 12:00 PM, 1 day from now
    end: setMinutes(setHours(addDays(new Date(), 1), 13), 15), // 1:15 PM, 1 day from now
    color: 'holiday',
    location: 'Video conference'
  },
  {
    id: '6',
    title: 'Hearing preparation window',
    description: 'Prepare exhibits and witness outline',
    start: addDays(new Date(), 3), // 3 days from now
    end: addDays(new Date(), 6), // 6 days from now
    allDay: true,
    color: 'business'
  },
  {
    id: '7',
    title: 'Meridian case conference',
    description: 'Prepare the hearing strategy with the client',
    start: setMinutes(setHours(addDays(new Date(), 4), 14), 30), // 2:30 PM, 4 days from now
    end: setMinutes(setHours(addDays(new Date(), 5), 14), 45), // 2:45 PM, 5 days from now
    color: 'personal',
    location: 'Meridian Health Group · Video conference'
  },
  {
    id: '8',
    title: 'Litigation team stand-up',
    description: 'Review court dates and assignments',
    start: setMinutes(setHours(addDays(new Date(), 5), 9), 0), // 9:00 AM, 5 days from now
    end: setMinutes(setHours(addDays(new Date(), 5), 10), 30), // 10:30 AM, 5 days from now
    color: 'family',
    location: 'Conference Room A'
  },
  {
    id: '9',
    title: 'Purchase agreement review',
    description: 'Resolve remaining redlines and approval points',
    start: setMinutes(setHours(addDays(new Date(), 5), 14), 0), // 2:00 PM, 5 days from now
    end: setMinutes(setHours(addDays(new Date(), 5), 15), 30), // 3:30 PM, 5 days from now
    color: 'etc',
    location: 'Conference Room A'
  },
  {
    id: '10',
    title: 'Witness preparation',
    description: 'Prepare deposition outline and exhibits',
    start: setMinutes(setHours(addDays(new Date(), 5), 9), 45), // 9:45 AM, 5 days from now
    end: setMinutes(setHours(addDays(new Date(), 5), 11), 0), // 11:00 AM, 5 days from now
    color: 'family',
    location: 'Conference Room A'
  },
  {
    id: '11',
    title: 'Matter review and planning',
    description: 'Review active matter milestones with practice lead',
    start: setMinutes(setHours(addDays(new Date(), 9), 10), 0), // 10:00 AM, 9 days from now
    end: setMinutes(setHours(addDays(new Date(), 9), 15), 30), // 3:30 PM, 9 days from now
    color: 'holiday',
    location: 'Conference Room B'
  },
  {
    id: '12',
    title: 'Motion filing deadline',
    description: 'File opposition brief and supporting declaration',
    start: addDays(new Date(), 17), // 17 days from now
    end: addDays(new Date(), 17), // 17 days from now
    allDay: true,
    color: 'etc',
    location: 'Court filing portal'
  },
  {
    id: '13',
    title: 'Client strategy workshop',
    description: 'Align stakeholders on negotiation objectives',
    start: setMinutes(setHours(addDays(new Date(), 26), 9), 0), // 9:00 AM, 26 days from now
    end: setMinutes(setHours(addDays(new Date(), 27), 17), 0), // 5:00 PM, 27 days from now
    color: 'personal',
    location: 'Conference Room A'
  }
]
