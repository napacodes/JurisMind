import type { ReactNode } from 'react'
import Link from 'next/link'

export function AuthShell({ eyebrow, title, description, children, administration = false }: {
  eyebrow: string; title: string; description: string; children: ReactNode; administration?: boolean
}) {
  return <main className='min-h-svh bg-[#07121d] text-slate-100'>
    <div className='mx-auto grid min-h-svh max-w-7xl gap-5 p-4 sm:p-6 lg:grid-cols-[1.08fr_.92fr] lg:gap-8 lg:p-10'>
      <section className={`relative hidden min-h-[560px] overflow-hidden rounded-3xl border p-9 lg:block lg:min-h-0 lg:p-12 ${administration
        ? 'border-amber-200/20 bg-[radial-gradient(ellipse_at_15%_10%,rgba(201,153,72,.22),transparent_40%),linear-gradient(145deg,#25231f,#171c26_62%,#0a1520)]'
        : 'border-white/10 bg-[radial-gradient(ellipse_at_15%_10%,rgba(32,156,148,.25),transparent_40%),linear-gradient(145deg,#0d2431,#111b2b_62%,#0a1520)]'}`}>
        <div className='absolute -right-28 -top-24 size-96 rounded-full border border-teal-200/10' aria-hidden='true' />
        <div className='absolute -right-12 -top-8 size-64 rounded-full border border-teal-200/10' aria-hidden='true' />
        <Link href='/' className='inline-flex items-center gap-3 text-lg font-semibold tracking-tight' aria-label='JurisMind home'>
          <span className='grid size-10 place-items-center rounded-xl bg-teal-300/15 text-teal-200'>J</span>JurisMind
        </Link>
        <div className='relative mt-24 max-w-lg'>
          <p className={`text-xs font-semibold uppercase tracking-[.24em] ${administration ? 'text-amber-200' : 'text-teal-200'}`}>{administration ? 'Platform operations' : 'Legal work, organized'}</p>
          <h1 className='mt-5 text-4xl font-semibold leading-tight tracking-tight lg:text-5xl'>{administration ? 'Oversight for the JurisMind platform.' : 'A clearer view of every working relationship.'}</h1>
          <p className='mt-5 max-w-md text-base leading-7 text-slate-300'>{administration
            ? 'A dedicated sign-in for authorized platform administrators. Access is granted by a server-managed platform role.'
            : 'Secure access for firms, lawyers, and their teams, grounded in the workspace memberships your organization controls.'}</p>
        </div>
        <div className='relative mt-16 max-w-xl rounded-2xl border border-white/10 bg-slate-950/45 p-5 shadow-2xl backdrop-blur-sm'>
          <div className='flex items-center justify-between border-b border-white/10 pb-4'><div className='flex gap-1.5'><span className={`size-2 rounded-full ${administration ? 'bg-amber-200/80' : 'bg-teal-300/80'}`} /><span className='size-2 rounded-full bg-slate-500' /><span className='size-2 rounded-full bg-slate-500' /></div><span className='text-xs text-slate-400'>{administration ? 'Administration console' : 'Workspace overview'}</span></div>
          <div className='mt-5 grid grid-cols-3 gap-3'>{(administration ? ['Firms', 'Access', 'Reviews'] : ['People', 'Matters', 'Updates']).map((label, index) => <div key={label} className='rounded-xl border border-white/10 bg-white/[.035] p-3'><p className='text-[11px] text-slate-400'>{label}</p><div className='mt-3 h-1.5 rounded-full bg-white/10'><div className={`h-full rounded-full ${administration ? 'bg-amber-200/65' : index === 1 ? 'bg-teal-300/35' : 'bg-teal-300/70'}`} style={{ width: `${72 - index * 13}%` }} /></div></div>)}</div>
          <div className='mt-4 space-y-2.5'>{[0, 1, 2].map((row) => <div key={row} className='flex items-center gap-3 rounded-lg bg-white/[.035] px-3 py-3'><span className='size-7 rounded-full bg-gradient-to-br from-teal-200/50 to-slate-500/30' /><div className='flex-1 space-y-1.5'><div className='h-1.5 w-28 rounded bg-white/20' /><div className='h-1 w-20 rounded bg-white/10' /></div><span className='h-1.5 w-12 rounded bg-teal-200/35' /></div>)}</div>
        </div>
        <p className='absolute bottom-9 left-9 text-xs text-slate-500 lg:left-12'>Your access follows your verified account and active workspace memberships.</p>
      </section>
      <section className='flex min-h-[calc(100svh-2rem)] items-center justify-center rounded-3xl border border-white/10 bg-[#0b1723] px-5 py-10 sm:min-h-[calc(100svh-3rem)] sm:px-10 lg:min-h-0'>
        <div className='w-full max-w-md'>
          <div className='mb-8 md:hidden'><Link href='/' className='inline-flex items-center gap-3 text-lg font-semibold'><span className='grid size-9 place-items-center rounded-xl bg-teal-300/15 text-teal-200'>J</span>JurisMind</Link></div>
          <p className='text-xs font-semibold uppercase tracking-[.2em] text-teal-200'>{eyebrow}</p>
          <h2 className='mt-3 text-3xl font-semibold tracking-tight'>{title}</h2>
          <p className='mt-2 mb-7 text-sm leading-6 text-slate-400'>{description}</p>
          {children}
        </div>
      </section>
    </div>
  </main>
}
