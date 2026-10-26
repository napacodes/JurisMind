'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Clock3, Download, ShieldCheck } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { ApiError, api } from '@/lib/api'
import type { FirmVerificationDetails, FirmVerificationMine, FirmVerificationStatus } from '@/lib/api'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const emptyDetails: FirmVerificationDetails = {
  legalName: '', registrationNumber: '', jurisdiction: '', legalForm: '', registeredAddress: '',
  representativeName: '', representativeTitle: '', authorityDescription: '',
}
const statusLabel: Record<FirmVerificationStatus, string> = {
  NOT_SUBMITTED: 'Incomplete', DRAFT: 'Draft', PENDING: 'Pending review', CHANGES_REQUESTED: 'Changes requested',
  APPROVED: 'Approved', REJECTED: 'Rejected', EXPIRED: 'Expired',
}

function statusIcon(status: FirmVerificationStatus) {
  if (status === 'APPROVED') return <CheckCircle2 className='size-4 text-green-700' aria-hidden='true' />
  if (status === 'PENDING') return <Clock3 className='size-4 text-amber-700' aria-hidden='true' />
  if (status === 'CHANGES_REQUESTED' || status === 'REJECTED') return <AlertCircle className='size-4 text-amber-700' aria-hidden='true' />
  return <ShieldCheck className='size-4 text-muted-foreground' aria-hidden='true' />
}

export default function FirmVerificationPage() {
  const { workspaces } = useAuth()
  const searchParams = useSearchParams()
  const requestedId = searchParams.get('workspaceId')
  const firmWorkspace = useMemo(() => requestedId
    ? workspaces.find((workspace) => workspace.id === requestedId && workspace.kind === 'FIRM'
      && workspace.permissions.includes('firm-kyc:submit:self'))
    : workspaces.find((workspace) => workspace.kind === 'FIRM' && workspace.permissions.includes('firm-kyc:submit:self')),
  [workspaces, requestedId])
  const workspaceId = firmWorkspace?.id ?? ''
  const [data, setData] = useState<FirmVerificationMine | null>(null)
  const [details, setDetails] = useState<FirmVerificationDetails>(emptyDetails)
  const [registrationDocument, setRegistrationDocument] = useState<File | null>(null)
  const [authorityDocument, setAuthorityDocument] = useState<File | null>(null)
  const [requiredDocuments, setRequiredDocuments] = useState<Array<'REGISTRATION' | 'AUTHORITY'>>(['REGISTRATION', 'AUTHORITY'])
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const refresh = useCallback(async () => {
    if (!workspaceId) { setData(null); setLoading(false); return }
    try {
      const result = await api.firmVerification(workspaceId)
      setData(result)
      setDetails(result.submissions[0]?.details ?? emptyDetails)
      setNotice('')
    } catch (error) {
      setNotice(error instanceof ApiError && error.status === 403
        ? 'Only an active Firm Admin can access verification for this firm.'
        : 'Firm verification status could not be loaded.')
    } finally { setLoading(false) }
  }, [workspaceId])

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      void api.firmKycDocumentPolicy(workspaceId, details.jurisdiction, details.legalForm)
        .then((policy) => { if (active) setRequiredDocuments(policy.requiredDocuments) })
        .catch(() => { if (active) setRequiredDocuments(['REGISTRATION', 'AUTHORITY']) })
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [workspaceId, details.jurisdiction, details.legalForm])

  useEffect(() => {
    let active = true
    if (!workspaceId) { void Promise.resolve().then(() => { if (active) setLoading(false) }); return () => { active = false } }
    void api.firmVerification(workspaceId).then((result) => {
      if (active) { setData(result); setDetails(result.submissions[0]?.details ?? emptyDetails); setNotice('') }
    }).catch((error: unknown) => {
      if (active) setNotice(error instanceof ApiError && error.status === 403
        ? 'Only an active Firm Admin can access verification for this firm.'
        : 'Firm verification status could not be loaded.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [workspaceId])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!workspaceId || (requiredDocuments.includes('REGISTRATION') && !registrationDocument)
      || (requiredDocuments.includes('AUTHORITY') && !authorityDocument)) {
      setNotice('Choose each document required for the selected jurisdiction and legal form.')
      return
    }
    setSubmitting(true); setNotice('')
    try {
      await api.submitFirmVerification(workspaceId, details, registrationDocument, authorityDocument)
      setRegistrationDocument(null); setAuthorityDocument(null)
      const registrationInput = window.document.getElementById('firm-registration-document') as HTMLInputElement | null
      const authorityInput = window.document.getElementById('firm-authority-document') as HTMLInputElement | null
      if (registrationInput) registrationInput.value = ''
      if (authorityInput) authorityInput.value = ''
      setNotice('Your firm verification was submitted for platform review.')
      await refresh()
    } catch (error) {
      setNotice(error instanceof ApiError && error.status === 409
        ? 'A review is already pending or this firm is already approved.'
        : 'The verification could not be submitted. Check the details and documents, then retry.')
    } finally { setSubmitting(false) }
  }

  async function download(submissionId: string, documentId: string) {
    if (!workspaceId) return
    try {
      const blob = await api.firmVerificationDocument(workspaceId, submissionId, documentId)
      const url = URL.createObjectURL(blob)
      const anchor = window.document.createElement('a')
      anchor.href = url; anchor.download = `firm-verification-${documentId}`; anchor.click()
      URL.revokeObjectURL(url)
    } catch { setNotice('The private firm verification document could not be retrieved.') }
  }

  async function saveDraft() {
    if (!workspaceId) return
    setSubmitting(true); setNotice('')
    try {
      await api.saveFirmVerificationDraft(workspaceId, details)
      await refresh()
      setNotice('Your firm verification draft was saved. It is not visible to reviewers until submitted.')
    } catch {
      setNotice('The draft could not be saved. A pending or approved submission cannot be edited.')
    } finally { setSubmitting(false) }
  }

  const currentStatus = data?.currentStatus ?? 'NOT_SUBMITTED'
  const canSubmit = currentStatus === 'NOT_SUBMITTED' || currentStatus === 'DRAFT' || currentStatus === 'CHANGES_REQUESTED' || currentStatus === 'REJECTED' || currentStatus === 'EXPIRED'
  const update = (field: keyof FirmVerificationDetails) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDetails((current) => ({ ...current, [field]: event.target.value }))

  if (!firmWorkspace) return <main className='mx-auto max-w-3xl space-y-4 py-8'><h1 className='text-3xl font-semibold'>Firm verification</h1>
    <p className='text-sm text-muted-foreground'>Choose a firm workspace where your account has active Firm Admin verification permission.</p></main>

  return <main className='mx-auto w-full max-w-4xl space-y-6 py-2'>
    <header><p className='text-sm font-medium text-primary'>Firm administration · {firmWorkspace.name}</p><h1 className='mt-1 text-3xl font-semibold tracking-tight'>Firm verification</h1>
      <p className='mt-2 max-w-2xl text-sm text-muted-foreground'>Submit legal entity and authorized representative information for platform review. Firm approval is separate from individual lawyer credentials and does not bypass existing access controls.</p></header>
    <Card><CardHeader><CardTitle className='flex items-center gap-2'>{statusIcon(currentStatus)}Current status: {loading ? 'Loading…' : statusLabel[currentStatus]}</CardTitle>
      <CardDescription>Provide documents required for your jurisdiction and legal form. Files are stored privately and can be accessed only by authorized firm administrators and platform reviewers.</CardDescription></CardHeader>
      {canSubmit && <CardContent><form onSubmit={(event) => void submit(event)} className='grid gap-4 sm:grid-cols-2'>
        <label className='space-y-1.5 text-sm sm:col-span-2'>Legal and registered firm name<Input required maxLength={200} value={details.legalName} onChange={update('legalName')} autoComplete='organization' /></label>
        <label className='space-y-1.5 text-sm'>Entity registration number<Input required maxLength={160} value={details.registrationNumber} onChange={update('registrationNumber')} autoComplete='off' /></label>
        <label className='space-y-1.5 text-sm'>Jurisdiction<Input required maxLength={120} value={details.jurisdiction} onChange={update('jurisdiction')} /></label>
        <label className='space-y-1.5 text-sm'>Legal form<Input required maxLength={120} value={details.legalForm} onChange={update('legalForm')} placeholder='As registered locally' /></label>
        <label className='space-y-1.5 text-sm sm:col-span-2'>Registered address<Textarea required maxLength={500} value={details.registeredAddress} onChange={update('registeredAddress')} autoComplete='street-address' /></label>
        <label className='space-y-1.5 text-sm'>Authorized representative name<Input required maxLength={200} value={details.representativeName} onChange={update('representativeName')} autoComplete='name' /></label>
        <label className='space-y-1.5 text-sm'>Representative title<Input required maxLength={120} value={details.representativeTitle} onChange={update('representativeTitle')} /></label>
        <label className='space-y-1.5 text-sm sm:col-span-2'>Evidence of authority details<Textarea required maxLength={1000} value={details.authorityDescription} onChange={update('authorityDescription')} placeholder='Describe the authority document and the representative’s role.' /></label>
        <label className='space-y-1.5 text-sm'>Firm registration document ({requiredDocuments.includes('REGISTRATION') ? 'required' : 'optional'}; PDF/JPEG/PNG, up to 10 MB)<Input id='firm-registration-document' type='file' accept='.pdf,application/pdf,image/jpeg,image/png' required={requiredDocuments.includes('REGISTRATION')} onChange={(event) => setRegistrationDocument(event.target.files?.[0] ?? null)} /></label>
        <label className='space-y-1.5 text-sm'>Representative authority evidence ({requiredDocuments.includes('AUTHORITY') ? 'required' : 'optional'}; PDF/JPEG/PNG, up to 10 MB)<Input id='firm-authority-document' type='file' accept='.pdf,application/pdf,image/jpeg,image/png' required={requiredDocuments.includes('AUTHORITY')} onChange={(event) => setAuthorityDocument(event.target.files?.[0] ?? null)} /></label>
        <div className='sm:col-span-2 flex flex-wrap gap-2'><Button type='button' variant='outline' disabled={submitting || loading} onClick={() => void saveDraft()}>{submitting ? 'Saving…' : 'Save draft'}</Button><Button type='submit' disabled={submitting || loading}>{submitting ? 'Submitting…' : currentStatus === 'CHANGES_REQUESTED' || currentStatus === 'REJECTED' || currentStatus === 'EXPIRED' ? 'Submit a revised verification' : 'Submit for review'}</Button></div>
      </form></CardContent>}
    </Card>
    {data?.submissions.map((submission) => <Card key={submission.id}><CardHeader><CardTitle className='text-base'>Submission history · {submission.status.replace('_', ' ')}</CardTitle>
      <CardDescription>{new Date(submission.createdAt).toLocaleString()}{submission.reviewedAt ? ` · Reviewed ${new Date(submission.reviewedAt).toLocaleString()}` : ''}{submission.expiresAt ? ` · Expires ${new Date(submission.expiresAt).toLocaleDateString()}` : ''}</CardDescription></CardHeader>
      <CardContent className='space-y-3 text-sm'><dl className='grid gap-2 sm:grid-cols-2'><div><dt className='text-muted-foreground'>Legal entity</dt><dd>{submission.details.legalName}</dd></div><div><dt className='text-muted-foreground'>Jurisdiction · legal form</dt><dd>{submission.details.jurisdiction} · {submission.details.legalForm}</dd></div></dl>
        {submission.reviewReason && <p className='rounded-md border border-amber-500/20 bg-amber-500/5 p-3'>Reviewer note: {submission.reviewReason}</p>}
        <div className='flex flex-wrap gap-2'>{submission.documents.map((document) => <Button key={document.id} variant='outline' size='sm' onClick={() => void download(submission.id, document.id)}><Download className='size-4' />{document.documentType === 'REGISTRATION' ? 'Registration document' : 'Authority evidence'}</Button>)}</div>
      </CardContent></Card>)}
    {notice && <p role='status' className='text-sm text-muted-foreground'>{notice}</p>}
  </main>
}
