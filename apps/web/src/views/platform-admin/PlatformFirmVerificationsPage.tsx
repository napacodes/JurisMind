'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Download, FileCheck2, RefreshCw } from 'lucide-react'
import { ApiError, api } from '@/lib/api'
import type { FirmVerificationDetail, FirmVerificationQueue } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

export default function PlatformFirmVerificationsPage() {
  const [queue, setQueue] = useState<FirmVerificationQueue | null>(null)
  const [selected, setSelected] = useState<FirmVerificationDetail | null>(null)
  const [reason, setReason] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'ALL'>('PENDING')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    try { setQueue(await api.firmVerificationsForReview(page, 25, statusFilter)); setNotice('') }
    catch (error) { setNotice(error instanceof ApiError && error.status === 403 ? 'Your account cannot access firm verification reviews.' : 'The firm review queue could not be loaded.') }
    finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => {
    let active = true
    void api.firmVerificationsForReview(page, 25, statusFilter).then((result) => {
      if (active) { setQueue(result); setNotice('') }
    }).catch((error: unknown) => {
      if (active) setNotice(error instanceof ApiError && error.status === 403 ? 'Your account cannot access firm verification reviews.' : 'The firm review queue could not be loaded.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, statusFilter])

  async function openDetail(id: string) {
    setNotice('')
    try { setSelected(await api.platformFirmVerification(id)); setReason('') }
    catch { setNotice('Firm verification details could not be loaded.') }
  }

  async function download(documentId: string) {
    if (!selected) return
    try {
      const blob = await api.platformFirmVerificationDocument(selected.id, documentId)
      const url = URL.createObjectURL(blob)
      const anchor = window.document.createElement('a')
      anchor.href = url; anchor.download = `firm-verification-${documentId}`; anchor.click()
      URL.revokeObjectURL(url)
    } catch { setNotice('The private firm document could not be retrieved.') }
  }

  async function review(decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED') {
    if (!selected || (decision !== 'APPROVED' && !reason.trim())) { setNotice('Enter a reason for requesting changes or rejecting this submission.'); return }
    setBusy(true); setNotice('')
    try {
      await api.reviewFirmVerification(selected.id, decision, reason.trim() || undefined)
      setSelected(null); setReason(''); setNotice(`Firm verification ${decision.toLowerCase().replace('_', ' ')}.`)
      await refresh()
    } catch (error) {
      setNotice(error instanceof ApiError && error.status === 403 ? 'Reviewing your own firm is not allowed.'
        : error instanceof ApiError && error.status === 409 ? 'Another reviewer has already decided this submission.' : 'The review could not be saved.')
    } finally { setBusy(false) }
  }

  return <div className='space-y-6'>
    <header className='flex flex-wrap items-start justify-between gap-3'><div><p className='text-sm font-medium text-primary'>Platform administration</p><h1 className='mt-1 text-3xl font-semibold tracking-tight'>Firm verification reviews</h1><p className='mt-2 max-w-2xl text-sm text-muted-foreground'>Review legal entity and representative evidence. Firm decisions do not verify individual lawyers.</p></div>
      <div className='flex items-center gap-2'><select aria-label='Firm verification history filter' className='h-9 rounded-md border bg-background px-2 text-sm' value={statusFilter}
        onChange={(event) => { setStatusFilter(event.target.value as 'PENDING' | 'ALL'); setPage(1) }}><option value='PENDING'>Pending reviews</option><option value='ALL'>All review history</option></select>
        <Button variant='outline' onClick={() => void refresh()} disabled={loading}><RefreshCw className='size-4' />Refresh</Button></div></header>
    <section className='space-y-3' aria-labelledby='firm-queue-title'><h2 id='firm-queue-title' className='text-lg font-semibold'>Submissions {queue ? `(${queue.pagination.total})` : ''}</h2>
      {loading && <p role='status' className='text-sm text-muted-foreground'>Loading firm verification submissions…</p>}
      {!loading && queue?.submissions.length === 0 && <Card><CardContent className='py-8 text-center text-sm text-muted-foreground'>No {statusFilter === 'PENDING' ? 'pending firm submissions' : 'firm review history'} found.</CardContent></Card>}
      {queue?.submissions.map((item) => <Card key={item.id}><CardHeader className='flex flex-row items-start justify-between gap-4'><div><CardTitle className='text-base'>{item.workspace.name}</CardTitle><CardDescription>{item.submittedBy.fullName} · {item.submittedBy.email} · {new Date(item.createdAt).toLocaleString()}</CardDescription></div><Badge variant={item.status === 'APPROVED' ? 'default' : 'secondary'}><FileCheck2 className='mr-1 size-3.5' />{item.status.replace('_', ' ')}</Badge></CardHeader>
        <CardContent className='flex flex-wrap items-center justify-between gap-3'><p className='text-sm text-muted-foreground'>{item.documents.length} private supporting documents</p><Button variant='outline' onClick={() => void openDetail(item.id)}>Review submission</Button></CardContent></Card>)}
      {queue && queue.pagination.totalPages > 1 && <nav aria-label='Firm verification pages' className='flex items-center justify-between'><Button variant='outline' disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button><p className='text-sm text-muted-foreground'>Page {queue.pagination.page} of {queue.pagination.totalPages}</p><Button variant='outline' disabled={page >= queue.pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button></nav>}
    </section>
    {selected && <Card aria-labelledby='firm-review-title'><CardHeader><CardTitle id='firm-review-title'>Review {selected.workspace.name}</CardTitle><CardDescription>{selected.submittedBy.fullName} · {selected.submittedBy.email} · Submitted {new Date(selected.createdAt).toLocaleString()}</CardDescription></CardHeader>
      <CardContent className='space-y-5'><dl className='grid gap-3 text-sm sm:grid-cols-2'>
        <div><dt className='text-muted-foreground'>Registered legal name</dt><dd className='font-medium'>{selected.details.legalName}</dd></div><div><dt className='text-muted-foreground'>Entity number</dt><dd className='font-mono font-medium'>{selected.details.registrationNumber}</dd></div>
        <div><dt className='text-muted-foreground'>Jurisdiction</dt><dd>{selected.details.jurisdiction}</dd></div><div><dt className='text-muted-foreground'>Legal form</dt><dd>{selected.details.legalForm}</dd></div>
        <div className='sm:col-span-2'><dt className='text-muted-foreground'>Registered address</dt><dd>{selected.details.registeredAddress}</dd></div>
        <div><dt className='text-muted-foreground'>Representative</dt><dd>{selected.details.representativeName} · {selected.details.representativeTitle}</dd></div><div><dt className='text-muted-foreground'>Authority details</dt><dd>{selected.details.authorityDescription}</dd></div>
        <div><dt className='text-muted-foreground'>State</dt><dd>{selected.status}</dd></div>
      </dl>
      <div className='space-y-2'><h3 className='text-sm font-semibold'>Private verification documents</h3>{selected.documents.map((document) => <Button key={document.id} variant='outline' size='sm' onClick={() => void download(document.id)}><Download className='size-4' />{document.documentType === 'REGISTRATION' ? 'Download registration document' : 'Download authority evidence'} ({Math.ceil(document.sizeBytes / 1024)} KB)</Button>)}</div>
      {selected.reviewReason && <p className='rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-sm'>Previous reviewer note: {selected.reviewReason}</p>}
      {selected.status === 'PENDING' && <><label className='block space-y-2 text-sm font-medium'>Review reason <Textarea maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder='Required for correction requests and rejection. Avoid unnecessary personal details.' /></label>
        <div className='flex flex-wrap gap-2'><Button onClick={() => void review('APPROVED')} disabled={busy}><CheckCircle2 className='size-4' />Approve firm</Button><Button variant='outline' onClick={() => void review('CHANGES_REQUESTED')} disabled={busy || !reason.trim()}>Request corrections</Button><Button variant='destructive' onClick={() => void review('REJECTED')} disabled={busy || !reason.trim()}>Reject</Button></div></>}
      <Button variant='ghost' onClick={() => setSelected(null)} disabled={busy}>Close</Button></CardContent></Card>}
    {notice && <p role='status' className='text-sm text-muted-foreground'>{notice}</p>}
  </div>
}
