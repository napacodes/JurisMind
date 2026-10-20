'use client'

import { useCallback, useEffect, useState } from 'react'
import { Eye, FilePlus2, Pencil, RefreshCw } from 'lucide-react'
import { api, type ContentEntry, type ContentInput, type ContentPage } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PlainTextBody } from '@/components/content/PlainTextBody'

const blank: ContentInput = { type: 'BLOG_POST', slug: '', title: '', summary: '', body: '', seoTitle: '', seoDescription: '' }

export default function PlatformContentPage() {
  const [result, setResult] = useState<ContentPage | null>(null)
  const [selected, setSelected] = useState<ContentEntry | null>(null)
  const [form, setForm] = useState<ContentInput>(blank)
  const [preview, setPreview] = useState<ContentEntry | null>(null)
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try { setResult(await api.platformContent(page)); setNotice('') }
    catch { setNotice('Content could not be loaded. Verify your Super Admin session and try again.') }
  }, [page])
  useEffect(() => {
    let active = true
    void api.platformContent(page).then((pageResult) => { if (active) { setResult(pageResult); setNotice('') } })
      .catch(() => { if (active) setNotice('Content could not be loaded. Verify your Super Admin session and try again.') })
    return () => { active = false }
  }, [page])

  function edit(entry: ContentEntry) {
    setSelected(entry)
    setForm({ type: entry.type, slug: entry.slug, title: entry.title, summary: entry.summary, body: entry.body,
      seoTitle: entry.seoTitle ?? '', seoDescription: entry.seoDescription ?? '' })
    setPreview(null)
  }

  async function save() {
    setBusy(true); setNotice('')
    try {
      const payload = { ...form, seoTitle: form.seoTitle || null, seoDescription: form.seoDescription || null }
      const entry = selected ? await api.updateContent(selected.id, payload, selected.updatedAt) : await api.createContent(payload)
      edit(entry); setNotice('Draft saved.'); await refresh()
    } catch { setNotice('Content could not be saved. Check the slug and required fields.') }
    finally { setBusy(false) }
  }

  async function action(value: 'publish' | 'unpublish' | 'archive') {
    if (!selected) return
    setBusy(true); setNotice('')
    try { const entry = await api.contentAction(selected.id, value); edit(entry); await refresh(); setNotice(value === 'unpublish' ? 'Content returned to draft.' : `Content ${value === 'publish' ? 'published' : 'archived'}.`) }
    catch { setNotice('The status change was not saved. Refresh and check the current content state.') }
    finally { setBusy(false) }
  }

  async function loadPreview() {
    if (!selected) return
    try { setPreview(await api.previewContent(selected.id)); setNotice('') }
    catch { setNotice('Authorized preview could not be loaded.') }
  }

  return <div className='space-y-6'>
    <header className='flex flex-wrap items-start justify-between gap-3'><div><p className='text-sm font-medium text-primary'>Platform administration</p><h1 className='mt-1 text-3xl font-semibold tracking-tight'>Website content</h1><p className='mt-2 max-w-2xl text-sm text-muted-foreground'>Manage public articles and informational pages. Draft previews are visible only to Super Admins.</p></div>
      <div className='flex gap-2'><Button variant='outline' onClick={() => void refresh()}><RefreshCw className='size-4' />Refresh</Button><Button onClick={() => { setSelected(null); setForm(blank); setPreview(null) }}><FilePlus2 className='size-4' />New content</Button></div>
    </header>
    <div className='grid items-start gap-5 xl:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.6fr)]'>
      <section className='space-y-3' aria-label='Content entries'>
        {result?.entries.map((entry) => <Card key={entry.id}>
          <CardHeader className='space-y-2'><div className='flex items-center justify-between gap-2'><Badge variant={entry.status === 'PUBLISHED' ? 'default' : 'secondary'}>{entry.status}</Badge><span className='text-xs text-muted-foreground'>{entry.type === 'BLOG_POST' ? 'Article' : 'Page'}</span></div><CardTitle className='text-base'>{entry.title}</CardTitle><CardDescription>/{entry.slug}</CardDescription><Button className='w-fit' variant='outline' size='sm' onClick={() => void api.previewContent(entry.id).then(edit).catch(() => setNotice('Content could not be opened.'))}><Pencil className='size-4' />Edit</Button></CardHeader>
        </Card>)}
        {result?.entries.length === 0 && <Card><CardContent className='py-8 text-center text-sm text-muted-foreground'>No content yet.</CardContent></Card>}
        {result && result.pagination.totalPages > 1 && <nav aria-label='Content pages' className='flex items-center justify-between'><Button variant='outline' size='sm' disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button><span className='text-xs text-muted-foreground'>Page {page} of {result.pagination.totalPages}</span><Button variant='outline' size='sm' disabled={page >= result.pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button></nav>}
      </section>
      <section className='space-y-4'>
        <Card><CardHeader><CardTitle>{selected ? 'Edit content' : 'Create content'}</CardTitle><CardDescription>Body content is plain text. HTML is displayed as text and never interpreted as markup.</CardDescription></CardHeader>
          <CardContent className='space-y-4'>
            <label className='block space-y-1 text-sm'>Type<select className='h-10 w-full rounded-md border bg-background px-3' value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ContentInput['type'] })}><option value='BLOG_POST'>Blog article</option><option value='INFORMATIONAL_PAGE'>Informational page</option></select></label>
            <label className='block space-y-1 text-sm'>Title<Input maxLength={180} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label className='block space-y-1 text-sm'>Slug<Input maxLength={120} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder='legal-workflow-guide' /></label>
            <label className='block space-y-1 text-sm'>Summary<Textarea maxLength={500} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></label>
            <label className='block space-y-1 text-sm'>Body<textarea className='min-h-56 w-full rounded-md border bg-background px-3 py-2 text-sm' maxLength={100000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
            <div className='grid gap-4 sm:grid-cols-2'><label className='block space-y-1 text-sm'>SEO title<Input maxLength={180} value={form.seoTitle ?? ''} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} /></label><label className='block space-y-1 text-sm'>SEO description<Input maxLength={320} value={form.seoDescription ?? ''} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} /></label></div>
            <div className='flex flex-wrap gap-2'><Button onClick={() => void save()} disabled={busy || selected?.status === 'ARCHIVED' || !form.title || !form.slug || !form.summary || !form.body}>{busy ? 'Saving…' : selected?.status === 'PUBLISHED' ? 'Save published changes' : 'Save draft'}</Button>{selected && <><Button variant='outline' onClick={() => void loadPreview()}><Eye className='size-4' />Preview</Button>{selected.status === 'DRAFT' && <Button variant='outline' onClick={() => void action('publish')} disabled={busy}>Publish</Button>}{selected.status === 'PUBLISHED' && <Button variant='outline' onClick={() => void action('unpublish')} disabled={busy}>Unpublish</Button>}{selected.status !== 'ARCHIVED' && <Button variant='destructive' onClick={() => void action('archive')} disabled={busy}>Archive</Button>}</>}</div>
          </CardContent>
        </Card>
        {preview && <Card><CardHeader><CardTitle>{preview.title}</CardTitle><CardDescription>Authorized preview · {preview.status}</CardDescription></CardHeader><CardContent><PlainTextBody body={preview.body} className='text-sm leading-7' /></CardContent></Card>}
      </section>
    </div>
    {notice && <p role='status' className='text-sm text-muted-foreground'>{notice}</p>}
  </div>
}
