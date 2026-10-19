import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PlainTextBody } from '@/components/content/PlainTextBody'

type PublicEntry = {
  type: 'BLOG_POST' | 'INFORMATIONAL_PAGE'; status: 'PUBLISHED'; slug: string; title: string
  summary: string; body: string; seoTitle: string | null; seoDescription: string | null; publishedAt: string | null
}

async function loadEntry(slug: string): Promise<PublicEntry | null> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '')
  if (!base) return null
  try {
    const response = await fetch(`${base}/public/content/${encodeURIComponent(slug)}`, { cache: 'no-store' })
    if (!response.ok) return null
    const entry = await response.json() as PublicEntry
    return entry.status === 'PUBLISHED' ? entry : null
  } catch { return null }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const entry = await loadEntry(slug)
  if (!entry) return { title: 'Content not found | JurisMind', robots: { index: false, follow: false } }
  return { title: entry.seoTitle || entry.title, description: entry.seoDescription || entry.summary,
    openGraph: { title: entry.seoTitle || entry.title, description: entry.seoDescription || entry.summary, type: 'article' } }
}

export default async function PublicContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const entry = await loadEntry(slug)
  if (!entry) notFound()
  return <main className='min-h-screen bg-white px-5 py-12 text-slate-900 sm:px-8 sm:py-20'>
    <article className='mx-auto max-w-3xl'>
      <Link href='/' className='text-sm font-semibold text-indigo-700 underline-offset-4 hover:underline'>JurisMind</Link>
      <p className='mt-10 text-sm font-semibold uppercase tracking-wide text-indigo-700'>{entry.type === 'BLOG_POST' ? 'Article' : 'Information'}</p>
      <h1 className='mt-3 text-4xl font-semibold tracking-tight sm:text-5xl'>{entry.title}</h1>
      <p className='mt-5 text-lg leading-8 text-slate-600'>{entry.summary}</p>
      {entry.publishedAt && <time className='mt-5 block text-sm text-slate-500' dateTime={entry.publishedAt}>{new Date(entry.publishedAt).toLocaleDateString()}</time>}
      <PlainTextBody body={entry.body} className='mt-10 text-base leading-8 text-slate-800' />
    </article>
  </main>
}
