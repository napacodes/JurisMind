'use client'

// Third-party Imports
import { format } from 'date-fns'
import { CheckIcon, DownloadIcon } from 'lucide-react'

// Type Imports
import type { AppUser, InvoiceStatus } from '@/types/apps/user-types'

// Component Imports
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// Util Imports
import { cn } from '@/lib/utils'

const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  paid: 'bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400',
  pending: 'bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400',
  cancelled: 'bg-destructive/10 text-destructive',
  draft: 'bg-muted text-muted-foreground'
}

const formatInvoiceStatus = (status: InvoiceStatus): string => {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export interface BillingTabProps {
  user: AppUser
}

export function BillingTab({ user }: BillingTabProps) {
  const billingPlan = user.billingPlan
  const invoices = user.invoices ?? []
  const daysProgress = billingPlan ? Math.round((billingPlan.daysUsed / billingPlan.totalDays) * 100) : 0

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Current Plan</CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {!billingPlan ? (
            <p className='text-muted-foreground text-sm'>No billing plan assigned.</p>
          ) : (
            <>
              <div className='flex flex-wrap items-start justify-between gap-4'>
                <div>
                  <div className='flex items-center gap-2'>
                    <h3 className='text-lg font-semibold'>{billingPlan.name}</h3>
                    {billingPlan.isPopular ? <Badge variant='secondary'>Popular</Badge> : null}
                  </div>
                  <p className='text-muted-foreground mt-1 text-sm'>
                    {user.plan} plan · {user.billing}
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-2xl font-semibold'>
                    ${billingPlan.price}
                    <span className='text-muted-foreground text-sm font-normal'>/{billingPlan.period}</span>
                  </p>
                  <Button variant='outline' size='sm' className='mt-2'>
                    Upgrade Plan
                  </Button>
                </div>
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-muted-foreground'>Days</span>
                  <span>
                    {billingPlan.daysUsed} of {billingPlan.totalDays} Days
                  </span>
                </div>
                <Progress value={daysProgress} className='*:data-[slot=progress-track]:h-2' />
                <p className='text-muted-foreground text-xs'>{daysProgress}% of billing period used</p>
              </div>

              <ul className='grid gap-2 sm:grid-cols-2'>
                {billingPlan.features.map(feature => (
                  <li key={feature} className='text-muted-foreground flex items-center gap-2 text-sm'>
                    <CheckIcon className='text-muted-foreground size-4 shrink-0' />
                    {feature}
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Billing Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div>
              <p className='text-muted-foreground text-sm'>Company</p>
              <p className='font-medium'>{user.company ?? '—'}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-sm'>Billing Email</p>
              <p className='font-medium'>{user.billingEmail ?? user.email}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-sm'>Tax ID</p>
              <p className='font-medium'>{user.taxId ?? '—'}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-sm'>Country</p>
              <p className='font-medium'>{user.country ?? '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className='gap-0 py-0'>
        <CardHeader className='border-b px-6 py-4'>
          <CardTitle className='text-base'>Invoice History</CardTitle>
        </CardHeader>
        {invoices.length === 0 ? (
          <CardContent className='py-8'>
            <p className='text-muted-foreground text-sm'>No invoices found.</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent'>
                <TableHead className='text-muted-foreground pl-6'>Invoice</TableHead>
                <TableHead className='text-muted-foreground'>Status</TableHead>
                <TableHead className='text-muted-foreground'>Total</TableHead>
                <TableHead className='text-muted-foreground'>Issued Date</TableHead>
                <TableHead className='text-muted-foreground pr-6 text-right'>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map(invoice => (
                <TableRow key={invoice.id}>
                  <TableCell className='pl-6 font-medium'>{invoice.number}</TableCell>
                  <TableCell>
                    <Badge className={cn('rounded-sm font-normal capitalize', INVOICE_STATUS_STYLES[invoice.status])}>
                      {formatInvoiceStatus(invoice.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>${invoice.total.toLocaleString()}</TableCell>
                  <TableCell className='text-muted-foreground'>
                    {format(new Date(invoice.issuedDate), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className='pr-6 text-right'>
                    <Button variant='ghost' size='icon' aria-label={`Download ${invoice.number}`}>
                      <DownloadIcon className='size-4' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
