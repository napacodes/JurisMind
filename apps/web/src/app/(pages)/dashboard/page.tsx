import Link from 'next/link'
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckSquare2,
  UsersRound
} from 'lucide-react'

import { MatterStatusChart } from '@/components/legal/MatterStatusChart'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { recentMatters, upcomingEvents } from '@/data/legal-demo'

const metrics = [
  { label: 'Active matters', value: '128', detail: '+8 opened this month', icon: BriefcaseBusiness },
  { label: 'Hearings & deadlines', value: '07', detail: 'Next 14 days', icon: CalendarClock },
  { label: 'Open tasks', value: '36', detail: '9 due this week', icon: CheckSquare2 },
  { label: 'Active clients', value: '84', detail: 'Across 6 practice areas', icon: UsersRound }
]

const statusVariant = (status: string): 'default' | 'destructive' | 'secondary' => {
  if (status === 'At risk') return 'destructive'
  if (status === 'Hearing') return 'secondary'
  return 'default'
}

export default function DashboardPage() {
  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <p className='text-sm text-muted-foreground'>Thursday, October 15, 2026</p>
          <h1 className='mt-1 text-2xl font-semibold tracking-tight'>Good morning, Jordan</h1>
          <p className='mt-1 text-muted-foreground'>Here’s what needs your attention across the firm.</p>
        </div>
        <Badge variant='outline' className='gap-1.5'><span className='size-1.5 rounded-full bg-amber-500' /> Demo workspace</Badge>
      </div>

      <section aria-label='Practice overview metrics' className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {metrics.map(metric => {
          const Icon = metric.icon
          return (
            <Card key={metric.label}>
              <CardContent className='flex items-start justify-between gap-4 p-5'>
                <div>
                  <p className='text-sm text-muted-foreground'>{metric.label}</p>
                  <p className='mt-2 text-3xl font-semibold tracking-tight'>{metric.value}</p>
                  <p className='mt-2 text-xs text-muted-foreground'>{metric.detail}</p>
                </div>
                <span className='rounded-lg bg-primary/8 p-2.5 text-primary'><Icon className='size-5' aria-hidden='true' /></span>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className='grid gap-6 xl:grid-cols-[1.15fr_0.85fr]'>
        <Card>
          <CardHeader className='flex flex-row items-start justify-between space-y-0'>
            <div className='space-y-1'>
              <CardTitle>Matter portfolio</CardTitle>
              <CardDescription>128 sample matters by current stage</CardDescription>
            </div>
            <Link href='/matters' className='inline-flex items-center gap-1 text-sm text-primary hover:underline'>View matters <ArrowUpRight className='size-4' /></Link>
          </CardHeader>
          <CardContent className='grid items-center gap-4 sm:grid-cols-[1fr_1fr]'>
            <MatterStatusChart />
            <ul className='space-y-3' aria-label='Matter status distribution'>
              {[
                ['Active', '74', 'bg-chart-1'],
                ['Discovery', '28', 'bg-chart-2'],
                ['Review', '16', 'bg-chart-3'],
                ['Hearing', '10', 'bg-chart-4']
              ].map(([label, count, color]) => (
                <li key={label} className='flex items-center justify-between gap-3 text-sm'>
                  <span className='flex items-center gap-2 text-muted-foreground'><span className={`size-2.5 rounded-full ${color}`} />{label}</span>
                  <span className='font-medium tabular-nums'>{count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming calendar</CardTitle>
            <CardDescription>Hearings, meetings, and key deadlines</CardDescription>
          </CardHeader>
          <CardContent className='space-y-1'>
            {upcomingEvents.map(event => (
              <div key={event.title} className='flex gap-4 border-b py-3 last:border-0 last:pb-0 first:pt-0'>
                <div className='w-12 shrink-0 pt-0.5 text-center'>
                  <span className='block text-[10px] font-semibold tracking-wide text-muted-foreground'>{event.date.slice(0, 3)}</span>
                  <span className='text-lg font-semibold leading-6'>{event.date.slice(4)}</span>
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <p className='truncate text-sm font-medium'>{event.title}</p>
                    <Badge variant='secondary' className='h-5 px-1.5 text-[10px]'>{event.type}</Badge>
                  </div>
                  <p className='mt-1 truncate text-xs text-muted-foreground'>{event.matter} · {event.time}</p>
                </div>
              </div>
            ))}
            <Link href='/apps/calendar' className='inline-flex items-center gap-1 pt-3 text-sm text-primary hover:underline'>Open calendar <ArrowUpRight className='size-4' /></Link>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className='flex flex-row items-start justify-between space-y-0'>
          <div className='space-y-1'>
            <CardTitle>Recent matter activity</CardTitle>
            <CardDescription>Updates from the sample workspace</CardDescription>
          </div>
          <Link href='/matters' className='inline-flex items-center gap-1 text-sm text-primary hover:underline'>All matters <ArrowUpRight className='size-4' /></Link>
        </CardHeader>
        <CardContent className='px-0'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Matter</TableHead><TableHead>Client</TableHead><TableHead>Lead counsel</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {recentMatters.map(matter => (
                  <TableRow key={matter.reference}>
                    <TableCell className='font-mono text-xs text-muted-foreground'>{matter.reference}</TableCell>
                    <TableCell className='font-medium'>{matter.matter}</TableCell>
                    <TableCell>{matter.client}</TableCell>
                    <TableCell>{matter.owner}</TableCell>
                    <TableCell><Badge variant={statusVariant(matter.status)}>{matter.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
