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
import type { LegalResource } from '@/data/legal-demo'

const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (['At risk', 'Overdue'].includes(status)) return 'destructive'
  if (['Active', 'Paid', 'Approved', 'Ready'].includes(status)) return 'default'
  if (['Hearing', 'In progress', 'Review', 'Sent'].includes(status)) return 'secondary'
  return 'outline'
}

export function LegalResourcePage({ resource }: { resource: LegalResource }) {
  return (
    <div className='space-y-6'>
      <div className='space-y-1'>
        <h1 className='text-2xl font-semibold tracking-tight'>{resource.title}</h1>
        <p className='text-muted-foreground'>{resource.description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{resource.title}</CardTitle>
          <CardDescription>Illustrative workspace records</CardDescription>
        </CardHeader>
        <CardContent className='px-0'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  {resource.columns.map(column => <TableHead key={column}>{column}</TableHead>)}
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resource.records.map((record, index) => (
                  <TableRow key={`${record.cells[0]}-${index}`}>
                    {record.cells.map((cell, cellIndex) => (
                      <TableCell key={`${cell}-${cellIndex}`} className={cellIndex === 0 ? 'font-medium' : ''}>
                        {cell}
                      </TableCell>
                    ))}
                    <TableCell><Badge variant={statusVariant(record.status)}>{record.status}</Badge></TableCell>
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
