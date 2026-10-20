'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Download, FileCheck2, RefreshCw } from 'lucide-react'
import { ApiError, api } from '@/lib/api'
import type { LawyerVerificationQueue, PlatformLawyerVerificationDetail } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

export default function PlatformLawyerVerificationsPage() {
  const [queue, setQueue] = useState<LawyerVerificationQueue | null>(null)
  const [selected, setSelected] = useState<PlatformLawyerVerificationDetail | null>(null)
  const [reason, setReason] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    try { setQueue(await api.pendingLawyerVerifications(page)); setNotice('') }
    catch (error) { setNotice(error instanceof ApiError && error.status === 403 ? 'Your account cannot access credential reviews.' : 'The review queue could not be loaded.') }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => {
    let active = true
    void api.pendingLawyerVerifications(page).then((result) => {
      if (active) { setQueue(result); setNotice('') }
    }).catch((error: unknown) => {
      if (active) setNotice(error instanceof ApiError && error.status === 403 ? 'Your account cannot access credential reviews.' : 'The review queue could not be loaded.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page])

  async function openDetail(id: string) {
    setNotice('')
    try { setSelected(await api.platformLawyerVerification(id)); setReason('') }
    catch { setNotice('Submission details could not be loaded.') }
  }

  async function download(documentId: string) {
    if (!selected) return
    try {
      const blob = await api.platformLawyerVerificationDocument(selected.id, documentId)
      const url = URL.createObjectURL(blob)
      const anchor = window.document.createElement('a')
      anchor.href = url; anchor.download = `credential-${documentId}`; anchor.click()
      URL.revokeObjectURL(url)
    } catch { setNotice('The private credential document could not be retrieved.') }
  }

  async function review(decision: 'APPROVED' | 'REJECTED') {
    if (!selected || (decision === 'REJECTED' && !reason.trim())) { setNotice('Enter a reason before rejecting a submission.'); return }
    setBusy(true); setNotice('')
    try {
      await api.reviewLawyerVerification(selected.id, decision, reason.trim() || undefined)
      setSelected(null); setReason(''); setNotice(`Submission ${decision.toLowerCase()}.`)
      if (page > 1 && queue?.submissions.length === 1) setPage((current) => current - 1)
      else await refresh()
    } catch (error) {
      setNotice(error instanceof ApiError && error.status === 409 ? 'Another reviewer has already decided this submission. Refresh the queue.' : 'The review could not be saved.')
    } finally { setBusy(false) }
  }

  return <div className='space-y-6'>
    <header className='flex flex-wrap items-start justify-between gap-3'><div><p className='text-sm font-medium text-primary'>Platform administration</p><h1 className='mt-1 text-3xl font-semibold tracking-tight'>Lawyer credential review</h1><p className='mt-2 max-w-2xl text-sm text-muted-foreground'>Review submitted professional-card details and documents. An approval records the platform review decision; it is not a legal determination or external credential authentication.</p></div>
      <Button variant='outline' onClick={() => { void refresh() }} disabled={loading}><RefreshCw className='size-4' />Refresh</Button></header>
    <section className='space-y-3' aria-labelledby='pending-title'><h2 id='pending-title' className='text-lg font-semibold'>Pending submissions {queue ? `(${queue.pagination.total})` : ''}</h2>
      {loading && <p role='status' className='text-sm text-muted-foreground'>Loading pending submissions…</p>}
      {!loading && queue?.submissions.length === 0 && <Card><CardContent className='py-8 text-center text-sm text-muted-foreground'>No pending credential submissions.</CardContent></Card>}
      {queue?.submissions.map((item) => <Card key={item.id}><CardHeader className='flex flex-row items-start justify-between gap-4'><div><CardTitle className='text-base'>{item.membership.user.fullName} ···· {item.cardIdentifierLast4}</CardTitle><CardDescription>{item.membership.workspace.name} · {item.jurisdiction} · {new Date(item.createdAt).toLocaleString()}</CardDescription></div><Badge variant='secondary'><FileCheck2 className='mr-1 size-3.5' />Pending</Badge></CardHeader>
        <CardContent className='flex flex-wrap items-center justify-between gap-3'><p className='text-sm text-muted-foreground'>{item.documents.length} supporting document{item.documents.length === 1 ? '' : 's'}</p><Button variant='outline' onClick={() => void openDetail(item.id)}>Review submission</Button></CardContent></Card>)}
      {queue && queue.pagination.totalPages > 1 && <nav aria-label='Credential submission pages' className='flex items-center justify-between'><Button variant='outline' disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button><p className='text-sm text-muted-foreground'>Page {queue.pagination.page} of {queue.pagination.totalPages}</p><Button variant='outline' disabled={page >= queue.pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button></nav>}
    </section>
    {selected && <Card aria-labelledby='submission-review-title'><CardHeader><CardTitle id='submission-review-title'>Review {selected.membership.user.fullName}</CardTitle><CardDescription>{selected.membership.user.email} · {selected.membership.workspace.name} · Submitted {new Date(selected.createdAt).toLocaleString()}</CardDescription></CardHeader>
      <CardContent className='space-y-5'><dl className='grid gap-3 text-sm sm:grid-cols-2'><div><dt className='text-muted-foreground'>Card holder</dt><dd className='font-medium'>{selected.cardHolderName}</dd></div><div><dt className='text-muted-foreground'>Jurisdiction</dt><dd className='font-medium'>{selected.jurisdiction}</dd></div><div><dt className='text-muted-foreground'>Professional-card identifier</dt><dd className='font-mono font-medium'>{selected.cardIdentifier}</dd></div><div><dt className='text-muted-foreground'>Submission state</dt><dd className='font-medium'>{selected.status}</dd></div></dl>
        <div className='space-y-2'><h3 className='text-sm font-semibold'>Private supporting documents</h3>{selected.documents.map((item) => <Button key={item.id} variant='outline' size='sm' onClick={() => void download(item.id)}><Download className='size-4' />Download document ({Math.ceil(item.sizeBytes / 1024)} KB)</Button>)}</div>
        <label className='block space-y-2 text-sm font-medium'>Review reason <Textarea maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder='Required when rejecting; do not include unnecessary confidential information.' /></label>
        <div className='flex flex-wrap gap-2'><Button onClick={() => void review('APPROVED')} disabled={busy}><CheckCircle2 className='size-4' />Approve</Button><Button variant='destructive' onClick={() => void review('REJECTED')} disabled={busy || !reason.trim()}>Reject submission</Button><Button variant='ghost' onClick={() => setSelected(null)} disabled={busy}>Close</Button></div>
      </CardContent></Card>}
    {notice && <p role='status' className='text-sm text-muted-foreground'>{notice}</p>}
  </div>
}
