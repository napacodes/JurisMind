'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Clock3, Download, ShieldCheck } from 'lucide-react'
import { ApiError, api } from '@/lib/api'
import type { LawyerVerificationMine } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const statusLabel: Record<LawyerVerificationMine['currentStatus'], string> = {
  NOT_SUBMITTED: 'Not submitted', PENDING: 'Pending review', APPROVED: 'Approved', REJECTED: 'Rejected',
}

function statusIcon(status: LawyerVerificationMine['currentStatus']) {
  if (status === 'APPROVED') return <CheckCircle2 className='size-4 text-green-700' aria-hidden='true' />
  if (status === 'PENDING') return <Clock3 className='size-4 text-amber-700' aria-hidden='true' />
  if (status === 'REJECTED') return <AlertCircle className='size-4 text-destructive' aria-hidden='true' />
  return <ShieldCheck className='size-4 text-muted-foreground' aria-hidden='true' />
}

export default function LawyerVerificationPage({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<LawyerVerificationMine | null>(null)
  const [cardHolderName, setCardHolderName] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [cardIdentifier, setCardIdentifier] = useState('')
  const [document, setDocument] = useState<File | null>(null)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const refresh = useCallback(async () => {
    if (!workspaceId) { setNotice('Choose an active lawyer workspace to continue.'); setLoading(false); return }
    try { setData(await api.lawyerVerification(workspaceId)); setNotice('') }
    catch (error) {
      setNotice(error instanceof ApiError && error.status === 403
        ? 'You need an active lawyer profile in this workspace to manage credential verification.'
        : 'Credential status could not be loaded.')
    } finally { setLoading(false) }
  }, [workspaceId])

  useEffect(() => {
    let active = true
    if (!workspaceId) {
      void Promise.resolve().then(() => {
        if (active) { setNotice('Choose an active lawyer workspace to continue.'); setLoading(false) }
      })
      return () => { active = false }
    }
    void api.lawyerVerification(workspaceId).then((result) => {
      if (active) { setData(result); setNotice('') }
    }).catch((error: unknown) => {
      if (active) setNotice(error instanceof ApiError && error.status === 403
        ? 'You need an active lawyer profile in this workspace to manage credential verification.'
        : 'Credential status could not be loaded.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [workspaceId])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice('')
    if (!document) { setNotice('Choose a PDF, JPEG, or PNG credential document.'); return }
    if (document.size > 10 * 1024 * 1024) { setNotice('The document must be 10 MB or smaller.'); return }
    setSubmitting(true)
    try {
      await api.submitLawyerVerification(workspaceId, { cardHolderName, jurisdiction, cardIdentifier }, document)
      setCardHolderName(''); setJurisdiction(''); setCardIdentifier(''); setDocument(null)
      const input = window.document.getElementById('credential-document') as HTMLInputElement | null
      if (input) input.value = ''
      setNotice('Your credential submission was received for platform review.')
      await refresh()
    } catch (error) {
      setNotice(error instanceof ApiError && error.status === 409
        ? 'A submission is already pending, or this lawyer profile has already been approved.'
        : 'The submission could not be completed. Check the details and document, then retry.')
    } finally { setSubmitting(false) }
  }

  async function download(submissionId: string, documentId: string) {
    try {
      const blob = await api.lawyerVerificationDocument(workspaceId, submissionId, documentId)
      const url = URL.createObjectURL(blob)
      const anchor = window.document.createElement('a')
      anchor.href = url; anchor.download = `credential-${documentId}`; anchor.click()
      URL.revokeObjectURL(url)
    } catch { setNotice('The credential document could not be retrieved.') }
  }

  const canSubmit = data?.currentStatus === 'NOT_SUBMITTED' || data?.currentStatus === 'REJECTED'

  return <main className='mx-auto w-full max-w-4xl space-y-6 py-2'>
    <header><p className='text-sm font-medium text-primary'>Professional profile</p><h1 className='mt-1 text-3xl font-semibold tracking-tight'>Lawyer credential verification</h1>
      <p className='mt-2 max-w-2xl text-sm text-muted-foreground'>Submit professional-card details and supporting documentation for an authorized platform review. Uploading a document does not approve or legally authenticate a credential.</p></header>
    <Card><CardHeader><CardTitle className='flex items-center gap-2'>{data ? statusIcon(data.currentStatus) : null}Current status: {data ? statusLabel[data.currentStatus] : loading ? 'Loading…' : 'Unavailable'}</CardTitle>
      <CardDescription>Documents are stored privately and are visible only to you and authorized platform reviewers.</CardDescription></CardHeader>
      {canSubmit && <CardContent><form onSubmit={(event) => void submit(event)} className='grid gap-4 sm:grid-cols-2'>
        <label className='space-y-1.5 text-sm'>Name on professional card<Input required maxLength={200} value={cardHolderName} onChange={(event) => setCardHolderName(event.target.value)} autoComplete='name' /></label>
        <label className='space-y-1.5 text-sm'>Issuing jurisdiction<Input required maxLength={120} value={jurisdiction} onChange={(event) => setJurisdiction(event.target.value)} /></label>
        <label className='space-y-1.5 text-sm sm:col-span-2'>Professional-card identifier<Input required maxLength={120} value={cardIdentifier} onChange={(event) => setCardIdentifier(event.target.value)} autoComplete='off' /></label>
        <label className='space-y-1.5 text-sm sm:col-span-2'>Supporting document (PDF, JPEG, PNG; up to 10 MB)<Input id='credential-document' type='file' accept='.pdf,application/pdf,image/jpeg,image/png' required onChange={(event) => setDocument(event.target.files?.[0] ?? null)} /></label>
        <div className='sm:col-span-2'><Button type='submit' disabled={submitting}>{submitting ? 'Submitting…' : data?.currentStatus === 'REJECTED' ? 'Submit a new version' : 'Submit for review'}</Button></div>
      </form></CardContent>}
    </Card>
    {data && data.submissions.length > 0 && <section className='space-y-3' aria-labelledby='history-title'><h2 id='history-title' className='text-xl font-semibold'>Submission history</h2>
      {data.submissions.map((submission) => <Card key={submission.id}><CardHeader className='flex flex-row items-start justify-between gap-4'><div><CardTitle className='text-base'>Submission ···· {submission.cardIdentifierLast4}</CardTitle><CardDescription>{new Date(submission.createdAt).toLocaleString()}</CardDescription></div><Badge variant={submission.status === 'APPROVED' ? 'default' : 'secondary'}>{submission.status}</Badge></CardHeader>
        <CardContent className='space-y-3 text-sm'><p>{submission.cardHolderName} · {submission.jurisdiction}</p>{submission.reviewReason && <p className='rounded-md border border-destructive/20 bg-destructive/5 p-3'>Review note: {submission.reviewReason}</p>}
          {submission.documents?.map((item) => <Button key={item.id} type='button' variant='outline' size='sm' onClick={() => void download(submission.id, item.id)}><Download className='size-4' />Download submitted document</Button>)}
        </CardContent></Card>)}
    </section>}
    {notice && <p role='status' className='text-sm text-muted-foreground'>{notice}</p>}
  </main>
}
