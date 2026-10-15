'use client'

import { Cell, Pie, PieChart, Tooltip } from 'recharts'

import { ChartContainer, type ChartConfig } from '@/components/ui/chart'

const data = [
  { status: 'Active', matters: 74, fill: 'var(--color-active)' },
  { status: 'Discovery', matters: 28, fill: 'var(--color-discovery)' },
  { status: 'Review', matters: 16, fill: 'var(--color-review)' },
  { status: 'Hearing', matters: 10, fill: 'var(--color-hearing)' }
]

const config = {
  active: { label: 'Active', color: 'var(--chart-1)' },
  discovery: { label: 'Discovery', color: 'var(--chart-2)' },
  review: { label: 'Review', color: 'var(--chart-3)' },
  hearing: { label: 'Hearing', color: 'var(--chart-4)' }
} satisfies ChartConfig

export function MatterStatusChart() {
  return (
    <ChartContainer config={config} className='mx-auto h-56 w-full max-w-80 aspect-auto'>
      <PieChart>
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)' }}
          formatter={(value, name) => [`${value} matters`, name]}
        />
        <Pie data={data} dataKey='matters' nameKey='status' innerRadius={58} outerRadius={86} paddingAngle={3} strokeWidth={2}>
          {data.map(entry => <Cell key={entry.status} fill={entry.fill} />)}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
