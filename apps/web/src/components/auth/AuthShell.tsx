import type { ReactNode } from 'react'
import Link from 'next/link'

export function AuthShell({ eyebrow, title, description, children, administration = false }: {
  eyebrow: string; title: string; description: string; children: ReactNode; administration?: boolean
}) {
  const accent = administration ? 'text-amber-200' : 'text-teal-200'
  const mark = administration ? 'bg-amber-300/15 text-amber-200' : 'bg-teal-300/15 text-teal-200'
  const accentDot = administration ? 'bg-amber-200/80' : 'bg-teal-300/80'
  const progress = administration ? 'bg-amber-200/65' : 'bg-teal-300/70'
  const ring = administration ? 'border-amber-200/10' : 'border-teal-200/10'
  const avatar = administration
    ? 'bg-gradient-to-br from-amber-200/50 to-slate-500/30'
    : 'bg-gradient-to-br from-teal-200/50 to-slate-500/30'
  const brandBackground = administration
    ? 'border-amber-200/20 bg-[radial-gradient(ellipse_at_15%_10%,rgba(201,153,72,.22),transparent_40%),linear-gradient(145deg,#25231f,#171c26_62%,#0a1520)]'
    : 'border-white/10 bg-[radial-gradient(ellipse_at_15%_10%,rgba(32,156,148,.25),transparent_40%),linear-gradient(145deg,#0d2431,#111b2b_62%,#0a1520)]'

  return <main className='min-h-screen min-h-dvh w-full overflow-x-clip bg-[#07121d] text-slate-100'>
    <div className='auth-shell-grid mx-auto grid w-full grid-cols-1 gap-3 p-3 sm:gap-4 sm:p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-4 md:p-5 lg:gap-5 lg:p-6 xl:gap-7 xl:p-8'>
      <section className={`relative hidden min-h-[560px] min-w-0 flex-col overflow-hidden rounded-3xl border p-7 sm:p-9 md:flex md:min-h-0 md:p-6 lg:p-8 xl:p-10 2xl:p-12 ${brandBackground}`}>
        <div className={`absolute -right-28 -top-24 size-96 rounded-full border ${ring}`} aria-hidden='true' />
        <div className={`absolute -right-12 -top-8 size-64 rounded-full border ${ring}`} aria-hidden='true' />
        <Link href='/' className='relative inline-flex w-fit items-center gap-3 text-lg font-semibold tracking-tight' aria-label='JurisMind home'>
          <span className={`grid size-10 place-items-center rounded-xl ${mark}`}>J</span>JurisMind
        </Link>

        <div className='relative mt-8 max-w-xl md:mt-5 xl:mt-8'>
          <p className={`text-xs font-semibold uppercase tracking-[.24em] ${accent}`}>{administration ? 'Platform operations' : 'Legal work, organized'}</p>
          <h1 className='mt-4 max-w-xl text-4xl leading-tight font-semibold tracking-tight md:text-3xl xl:text-[2.75rem]'>{administration ? 'Oversight for the JurisMind platform.' : 'A clearer view of every working relationship.'}</h1>
          <p className='mt-4 max-w-md text-base leading-7 text-slate-300'>{administration
            ? 'A dedicated sign-in for authorized platform administrators. Access is granted by a server-managed platform role.'
            : 'Secure access for firms, lawyers, and their teams, grounded in the workspace memberships your organization controls.'}</p>
        </div>

        <div className='relative mt-4 w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950/45 p-3 shadow-2xl backdrop-blur-sm sm:p-4 md:mt-3 xl:mt-5'>
          <div className='flex items-center justify-between border-b border-white/10 pb-4'>
            <div className='flex gap-1.5'><span className={`size-2 rounded-full ${accentDot}`} /><span className='size-2 rounded-full bg-slate-500' /><span className='size-2 rounded-full bg-slate-500' /></div>
            <span className='text-xs text-slate-400'>{administration ? 'Administration console' : 'Workspace overview'}</span>
          </div>
          <div className='mt-5 grid grid-cols-3 gap-3'>{(administration ? ['Firms', 'Access', 'Reviews'] : ['People', 'Matters', 'Updates']).map((label, index) => <div key={label} className='rounded-xl border border-white/10 bg-white/[.035] p-3'><p className='text-[11px] text-slate-400'>{label}</p><div className='mt-3 h-1.5 rounded-full bg-white/10'><div className={`h-full rounded-full ${administration || index !== 1 ? progress : 'bg-teal-300/35'}`} style={{ width: `${72 - index * 13}%` }} /></div></div>)}</div>
          <div className='mt-4 space-y-2.5'>{[0].map((row) => <div key={row} className='flex items-center gap-3 rounded-lg bg-white/[.035] px-3 py-2 sm:py-2.5'><span className={`size-7 shrink-0 rounded-full ${avatar}`} /><div className='min-w-0 flex-1 space-y-1.5'><div className='h-1.5 w-28 max-w-full rounded bg-white/20' /><div className='h-1 w-20 max-w-full rounded bg-white/10' /></div><span className={`h-1.5 w-12 shrink-0 rounded ${administration ? 'bg-amber-200/35' : 'bg-teal-200/35'}`} /></div>)}</div>
        </div>
        <p className='relative mt-auto pt-6 text-xs text-slate-500 lg:absolute lg:bottom-8 lg:left-8 lg:mt-0 lg:pt-0 xl:left-10 2xl:left-12'>Your access follows your verified account and active workspace memberships.</p>
      </section>

      <section className='flex min-h-[calc(100vh-1.5rem)] min-h-[calc(100dvh-1.5rem)] min-w-0 items-center justify-center rounded-3xl border border-white/10 bg-[#0b1723] px-5 py-8 sm:min-h-[calc(100vh-2rem)] sm:min-h-[calc(100dvh-2rem)] sm:px-8 md:min-h-0 md:px-5 md:py-6 lg:px-8 xl:px-12'>
        <div className='w-full max-w-[32rem]'>
          <div className='mb-8 md:hidden'><Link href='/' className='inline-flex items-center gap-3 text-lg font-semibold'><span className={`grid size-9 place-items-center rounded-xl ${mark}`}>J</span>JurisMind</Link></div>
          <p className={`text-xs font-semibold uppercase tracking-[.2em] ${accent}`}>{eyebrow}</p>
          <h2 className='mt-3 text-3xl font-semibold tracking-tight'>{title}</h2>
          <p className='mt-2 mb-7 text-sm leading-6 text-slate-400'>{description}</p>
          {children}
        </div>
      </section>
    </div>
  </main>
}
