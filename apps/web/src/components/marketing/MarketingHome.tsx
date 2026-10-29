import Link from 'next/link'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Files,
  FolderKanban,
  Gavel,
  Menu,
  MessagesSquare,
  Scale,
  Sparkles,
  UsersRound,
} from 'lucide-react'

const capabilities = [
  { icon: FolderKanban, label: 'Matters' },
  { icon: UsersRound, label: 'Client CRM' },
  { icon: Files, label: 'Documents' },
  { icon: CalendarDays, label: 'Hearings & deadlines' },
  { icon: Clock3, label: 'Time & billing' },
  { icon: BriefcaseBusiness, label: 'Firm operations' },
]

const questions = [
  {
    question: 'What is JurisMind?',
    answer:
      'JurisMind is a legal workspace concept for bringing matter records, client relationships, documents, calendars, and firm operations into a more connected view.',
  },
  {
    question: 'Is the sample workspace connected to live firm data?',
    answer:
      'No. The dashboard preview uses illustrative sample data and is not connected to a firm, client, or backend account.',
  },
  {
    question: 'Are packages and pricing available?',
    answer:
      'Pricing and package details have not been finalized. The plans below are configurable scope examples, not offers or price quotes.',
  },
  {
    question: 'Can my firm use this for confidential matters today?',
    answer:
      'Not yet. JurisMind is under development; production access, data handling, and authorization workflows are not represented by this preview.',
  },
]

function Wordmark({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href='/' className={`inline-flex items-center gap-2.5 font-semibold tracking-tight ${inverse ? 'text-white' : 'text-slate-950'}`} aria-label='JurisMind home'>
      <span className={`grid size-9 place-items-center rounded-xl ${inverse ? 'bg-white/10 text-white' : 'bg-indigo-600 text-white'}`}>
        <Scale size={19} strokeWidth={2.2} aria-hidden='true' />
      </span>
      <span className='text-lg'>JurisMind</span>
    </Link>
  )
}

function ButtonLink({ href, children, secondary = false }: { href: string; children: React.ReactNode; secondary?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 ${secondary ? 'border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700'}`}
    >
      {children}
    </Link>
  )
}

function Navigation() {
  return (
    <header className='relative z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl'>
      <nav className='mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10' aria-label='Main navigation'>
        <Wordmark />
        <div className='hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex'>
          <Link className='hover:text-indigo-700' href='#features'>Platform</Link>
          <Link className='hover:text-indigo-700' href='#workflow'>How it works</Link>
          <Link className='hover:text-indigo-700' href='#plans'>Plans</Link>
          <Link className='hover:text-indigo-700' href='#faq'>FAQ</Link>
        </div>
        <div className='hidden items-center gap-3 md:flex'>
          <Link className='px-3 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-700' href='/login'>Login</Link>
          <Link className='px-3 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-700' href='/dashboard'>Preview workspace</Link>
          <Link className='inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700' href='#contact'>Get in touch <ArrowUpRight size={15} aria-hidden='true' /></Link>
        </div>
        <details className='group relative md:hidden'>
          <summary className='grid size-10 cursor-pointer list-none place-items-center rounded-full border border-slate-200 text-slate-700 focus-visible:outline-2 focus-visible:outline-indigo-600' aria-label='Open navigation menu'>
            <Menu size={20} aria-hidden='true' />
          </summary>
          <div className='absolute right-0 top-12 flex w-56 flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg'>
            <Link className='rounded-xl px-3 py-2.5 text-sm hover:bg-slate-50' href='#features'>Platform</Link>
            <Link className='rounded-xl px-3 py-2.5 text-sm hover:bg-slate-50' href='#workflow'>How it works</Link>
            <Link className='rounded-xl px-3 py-2.5 text-sm hover:bg-slate-50' href='#plans'>Plans</Link>
            <Link className='rounded-xl px-3 py-2.5 text-sm hover:bg-slate-50' href='#faq'>FAQ</Link>
            <Link className='rounded-xl px-3 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50' href='/login'>Login</Link>
            <Link className='rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white' href='/dashboard'>Preview workspace</Link>
          </div>
        </details>
      </nav>
    </header>
  )
}

function WorkspacePreview() {
  return (
    <div className='relative mx-auto w-full max-w-[610px] min-w-0'>
      <div className='relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5'>
        <div className='flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6'>
          <div className='flex items-center gap-3'>
            <div className='grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-700'><Scale size={18} aria-hidden='true' /></div>
            <div><p className='text-sm font-semibold text-slate-900'>Matter overview</p><p className='text-xs text-slate-500'>Workspace preview</p></div>
          </div>
          <span className='rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800'>Sample data</span>
        </div>
        <div className='grid gap-4 p-5 sm:grid-cols-[1.35fr_0.9fr] sm:p-6'>
          <div className='space-y-4'>
            <div className='rounded-2xl bg-slate-50 p-4'>
              <div className='mb-3 flex items-start justify-between gap-2'><div><p className='text-[11px] font-semibold uppercase tracking-wider text-indigo-700'>Commercial · JM-2048</p><p className='mt-1 text-base font-semibold text-slate-900'>Northstar lease review</p></div><span className='rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-800'>In progress</span></div>
              <p className='text-xs text-slate-500'>Client: Northstar Properties (sample)</p>
              <div className='mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-xs'><span className='text-slate-500'>Lead counsel</span><span className='font-medium text-slate-800'>A. Morgan</span></div>
            </div>
            <div className='rounded-2xl border border-slate-200 p-4'>
              <div className='mb-3 flex items-center justify-between'><p className='text-xs font-semibold text-slate-800'>Matter activity</p><span className='text-[10px] text-slate-400'>THIS WEEK</span></div>
              <div className='space-y-3'>
                <Activity icon={Files} title='Draft circulated' detail='Lease amendment · 10:42 AM' tone='violet' />
                <Activity icon={MessagesSquare} title='Client note added' detail='Review comments · Yesterday' tone='blue' />
                <Activity icon={CalendarDays} title='Hearing date confirmed' detail='Initial conference · May 28' tone='amber' />
              </div>
            </div>
          </div>
          <aside className='space-y-4'>
            <div className='rounded-2xl bg-[#F1EEFF] p-4 text-[#10152B]'><div className='flex items-center justify-between text-slate-600'><span className='text-xs'>Next deadline</span><CalendarDays size={16} aria-hidden='true' /></div><p className='mt-4 text-2xl font-semibold'>May 28</p><p className='mt-1 text-xs text-slate-600'>Initial conference · 9:30 AM</p><div className='mt-4 h-1 rounded-full bg-[#DCD5FF]'><div className='h-1 w-2/3 rounded-full bg-[#5138F5]' /></div></div>
            <div className='rounded-2xl border border-slate-200 p-4'><p className='text-xs font-semibold text-slate-800'>Matter checklist</p><div className='mt-3 space-y-2.5'><Checklist>Engagement confirmed</Checklist><Checklist>Key dates recorded</Checklist><Checklist complete>Draft shared</Checklist></div></div>
            <div className='rounded-2xl bg-emerald-50 p-4'><div className='flex items-center gap-2 text-emerald-800'><Clock3 size={15} aria-hidden='true' /><span className='text-xs font-semibold'>Time tracked</span></div><p className='mt-2 text-xl font-semibold text-slate-900'>4h 20m</p><p className='text-[11px] text-slate-500'>Illustrative matter summary</p></div>
          </aside>
        </div>
        <div className='flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[10px] text-slate-500 sm:px-6'><span>Illustrative interface · not connected to live data</span><span className='hidden sm:inline'>JurisMind workspace</span></div>
      </div>
    </div>
  )
}

function Activity({ icon: Icon, title, detail, tone }: { icon: typeof Files; title: string; detail: string; tone: string }) {
  const tones: Record<string, string> = { violet: 'bg-violet-100 text-violet-700', blue: 'bg-sky-100 text-sky-700', amber: 'bg-amber-100 text-amber-700' }
  return <div className='flex items-center gap-3'><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${tones[tone]}`}><Icon size={15} aria-hidden='true' /></span><div className='min-w-0'><p className='truncate text-xs font-medium text-slate-800'>{title}</p><p className='truncate text-[10px] text-slate-500'>{detail}</p></div></div>
}

function Checklist({ children, complete = false }: { children: React.ReactNode; complete?: boolean }) {
  return <div className='flex items-center gap-2 text-[11px] text-slate-600'><span className={`grid size-4 place-items-center rounded-full ${complete ? 'bg-emerald-100 text-emerald-700' : 'border border-slate-300'}`}>{complete && <Check size={10} aria-hidden='true' />}</span>{children}</div>
}

function Hero() {
  return (
    <section className='relative overflow-hidden bg-white'>
      <div className='mx-auto grid w-full max-w-7xl min-w-0 items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10 lg:px-10 lg:py-24'>
        <div className='max-w-xl'>
          <div className='mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-indigo-800 shadow-sm'><Sparkles size={14} aria-hidden='true' />A clearer view of legal work</div>
          <h1 className='text-4xl leading-[1.08] font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-[3.65rem]'>Every matter. Every client. <span className='text-indigo-600'>One legal workspace.</span></h1>
          <p className='mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg sm:leading-8'>Bring matter management, client relationships, documents, hearings, deadlines, and firm operations together—so your team can spend less time switching context.</p>
          <div className='mt-8 flex flex-col gap-3 sm:flex-row'><ButtonLink href='/dashboard'>Explore the workspace <ArrowRight size={16} aria-hidden='true' /></ButtonLink><ButtonLink href='#features' secondary>See what’s inside <ArrowDownRight size={16} aria-hidden='true' /></ButtonLink></div>
          <p className='mt-5 text-xs text-slate-500'>Preview the interface with sample records. No account required.</p>
        </div>
        <WorkspacePreview />
      </div>
    </section>
  )
}

function CapabilitiesStrip() {
  return <section aria-label='Workspace capabilities' className='border-y border-slate-200 bg-white'><div className='mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10'><p className='mb-5 text-center text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase'>One connected view of your practice</p><div className='grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 lg:grid-cols-6'>{capabilities.map(({ icon: Icon, label }) => <div key={label} className='flex items-center justify-center gap-2 text-xs font-semibold text-slate-600'><Icon size={16} className='text-indigo-600' aria-hidden='true' />{label}</div>)}</div></div></section>
}

const features = [
  { icon: FolderKanban, number: '01', title: 'Matter work, in context', body: 'Keep case details, tasks, key dates, and updates connected to the matter they belong to.', color: 'bg-indigo-50 text-indigo-700' },
  { icon: UsersRound, number: '02', title: 'Client relationships, connected', body: 'See client contacts, communication history, and related matters in one clear place.', color: 'bg-sky-50 text-sky-700' },
  { icon: Gavel, number: '03', title: 'Dates that stay visible', body: 'Bring hearings, filing deadlines, and team commitments into a shared calendar view.', color: 'bg-amber-50 text-amber-700' },
  { icon: Clock3, number: '04', title: 'Operations at a glance', body: 'Bring time entries, billing activity, and practice reporting closer to everyday work.', color: 'bg-emerald-50 text-emerald-700' },
]

function Features() {
  return <section id='features' className='scroll-mt-20 bg-white py-20 sm:py-24'><div className='mx-auto max-w-7xl px-5 sm:px-8 lg:px-10'><div className='mx-auto max-w-2xl text-center'><p className='text-xs font-bold tracking-[0.18em] text-indigo-700 uppercase'>A workspace shaped around legal work</p><h2 className='mt-4 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl'>Less searching. More forward motion.</h2><p className='mt-4 text-base leading-7 text-slate-600'>The pieces of a practice work better when matter, client, and team context are close at hand.</p></div><div className='mt-12 grid gap-4 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4'>{features.map(({ icon: Icon, number, title, body, color }) => <article key={number} className='group rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-md hover:shadow-slate-900/5'><div className='flex items-center justify-between'><span className={`grid size-11 place-items-center rounded-2xl ${color}`}><Icon size={20} aria-hidden='true' /></span><span className='text-xs font-semibold text-slate-300'>{number}</span></div><h3 className='mt-7 text-lg font-semibold tracking-tight text-slate-900'>{title}</h3><p className='mt-2 text-sm leading-6 text-slate-600'>{body}</p><Link href='/dashboard' aria-label={`Preview ${title}`} className='mt-6 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700'>Explore workspace <ArrowRight size={13} aria-hidden='true' /></Link></article>)}</div></div></section>
}

function WorkflowSections() {
  return <section id='workflow' className='scroll-mt-20 overflow-hidden bg-[#F6F7FC] py-20 sm:py-24'><div className='mx-auto w-full max-w-7xl min-w-0 space-y-20 px-5 sm:px-8 lg:space-y-28 lg:px-10'>
    <div className='grid items-center gap-10 lg:grid-cols-2 lg:gap-20'><div className='order-2 lg:order-1'><div className='rounded-3xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-900/5 sm:p-7'><div className='flex items-center justify-between border-b border-slate-100 pb-4'><div><p className='text-xs font-semibold text-slate-500'>MATTER TIMELINE</p><p className='mt-1 text-sm font-semibold text-slate-900'>Northstar lease review <span className='font-normal text-slate-400'>· sample</span></p></div><span className='rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-semibold text-indigo-700'>4 milestones</span></div><div className='relative mt-6 space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[9px] before:w-px before:bg-slate-200'>{[['May 12', 'Document review', 'Completed', 'emerald'], ['May 20', 'Client comments due', 'Upcoming', 'indigo'], ['May 28', 'Initial conference', 'Court date', 'amber'], ['Jun 04', 'Follow-up notes', 'Planned', 'slate']].map(([date, title, label, tone]) => <div key={title} className='relative flex items-center gap-4 pl-1'><span className={`z-10 grid size-[18px] shrink-0 place-items-center rounded-full border-4 border-white ${tone === 'emerald' ? 'bg-emerald-500' : tone === 'indigo' ? 'bg-indigo-600' : tone === 'amber' ? 'bg-amber-500' : 'bg-slate-300'}`} /><span className='w-12 text-[10px] font-semibold text-slate-500'>{date}</span><span className='min-w-0 flex-1'><span className='block text-xs font-semibold text-slate-800'>{title}</span><span className='text-[10px] text-slate-500'>{label}</span></span><ArrowUpRight size={13} className='text-slate-300' aria-hidden='true' /></div>)}</div></div></div><div className='order-1 lg:order-2'><p className='text-xs font-bold tracking-[0.18em] text-indigo-700 uppercase'>Stay ahead of the next step</p><h2 className='mt-4 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl'>Keep every matter moving with a shared sense of what’s next.</h2><p className='mt-5 text-base leading-7 text-slate-600'>See important dates, assigned work, matter activity, and open tasks together. Give the team a common view of progress without losing the details that matter.</p><ul className='mt-6 space-y-3 text-sm text-slate-700'><li className='flex gap-3'><Check size={17} className='mt-0.5 shrink-0 text-indigo-600' aria-hidden='true' />Organize key dates, hearings, and filing deadlines</li><li className='flex gap-3'><Check size={17} className='mt-0.5 shrink-0 text-indigo-600' aria-hidden='true' />Connect tasks and updates to the right matter</li><li className='flex gap-3'><Check size={17} className='mt-0.5 shrink-0 text-indigo-600' aria-hidden='true' />Keep responsibilities visible across the team</li></ul><Link href='/dashboard' className='mt-7 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700'>View the sample workspace <ArrowRight size={15} aria-hidden='true' /></Link></div></div>
    <div className='grid items-center gap-10 lg:grid-cols-2 lg:gap-20'><div><p className='text-xs font-bold tracking-[0.18em] text-indigo-700 uppercase'>A fuller picture of client work</p><h2 className='mt-4 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl'>Bring documents, people, and communication into context.</h2><p className='mt-5 text-base leading-7 text-slate-600'>Give each matter a working home for its documents, client touchpoints, team notes, and time entries. Less hunting through disconnected screens means a steadier handoff from one step to the next.</p><div className='mt-7 flex flex-wrap gap-2'>{['Client CRM', 'Document records', 'Team collaboration', 'Time tracking'].map((item) => <span key={item} className='rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600'>{item}</span>)}</div><Link href='/dashboard' className='mt-7 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700'>Explore the interface <ArrowRight size={15} aria-hidden='true' /></Link></div><div className='relative'><div className='relative rounded-3xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-900/5 sm:p-7'><div className='flex items-start justify-between'><div><p className='text-xs font-semibold text-slate-500'>CLIENT RECORD</p><h3 className='mt-2 text-xl font-semibold text-slate-900'>Northstar Properties</h3><p className='mt-1 text-xs text-slate-500'>Sample client · 3 linked matters</p></div><span className='grid size-11 place-items-center rounded-2xl bg-sky-100 text-sky-700'><UsersRound size={20} aria-hidden='true' /></span></div><div className='mt-6 grid grid-cols-2 gap-3'><div className='rounded-2xl bg-slate-50 p-4'><p className='text-[10px] font-semibold text-slate-500'>OPEN MATTERS</p><p className='mt-2 text-2xl font-semibold text-slate-900'>03</p></div><div className='rounded-2xl bg-slate-50 p-4'><p className='text-[10px] font-semibold text-slate-500'>LAST TOUCHPOINT</p><p className='mt-2 text-sm font-semibold text-slate-900'>May 14</p><p className='text-[10px] text-slate-500'>Document review</p></div></div><div className='mt-4 rounded-2xl border border-slate-200 p-4'><div className='mb-3 flex items-center justify-between'><span className='text-xs font-semibold text-slate-800'>Recent activity</span><span className='text-[10px] text-slate-400'>SAMPLE</span></div><div className='flex items-center gap-3'><span className='grid size-8 place-items-center rounded-xl bg-violet-100 text-violet-700'><MessagesSquare size={15} aria-hidden='true' /></span><div><p className='text-xs font-medium text-slate-800'>Review note recorded</p><p className='text-[10px] text-slate-500'>Matter JM-2048 · A. Morgan</p></div></div></div></div></div></div>
  </div></section>
}

const plans = [
  { name: 'Core practice', descriptor: 'For a focused matter workflow', items: ['Matter and client records', 'Shared deadlines and tasks', 'Document organization'], featured: false },
  { name: 'Connected team', descriptor: 'For coordinating across a team', items: ['Everything in Core practice', 'Team collaboration views', 'Time and billing workflows'], featured: true },
  { name: 'Firm operations', descriptor: 'For a broader firm-wide view', items: ['Everything in Connected team', 'Practice reporting views', 'Configurable workflows'], featured: false },
]

function Plans() {
  return <section id='plans' className='scroll-mt-20 bg-white py-20 sm:py-24'><div className='mx-auto max-w-7xl px-5 sm:px-8 lg:px-10'><div className='mx-auto max-w-2xl text-center'><p className='text-xs font-bold tracking-[0.18em] text-indigo-700 uppercase'>A flexible starting point</p><h2 className='mt-4 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl'>A workspace that can grow with your practice.</h2><p className='mt-4 text-base leading-7 text-slate-600'>Example package scopes to help frame a conversation. Final features and pricing are not set.</p></div><div className='mt-12 grid gap-4 lg:grid-cols-3'>{plans.map(({ name, descriptor, items, featured }) => <article key={name} className={`rounded-3xl border p-6 sm:p-7 ${featured ? 'border-indigo-200 bg-white text-slate-900 shadow-md shadow-slate-900/5' : 'border-slate-200 bg-white text-slate-900'}`}><div className='flex items-start justify-between gap-3'><div><h3 className='text-lg font-semibold'>{name}</h3><p className='mt-1 text-sm text-slate-500'>{descriptor}</p></div>{featured && <span className='rounded-full bg-[#F1EEFF] px-2.5 py-1 text-[10px] font-semibold text-[#5138F5]'>Example scope</span>}</div><div className='my-6 border-t border-slate-200' /><ul className='space-y-3'>{items.map((item) => <li key={item} className='flex items-start gap-2.5 text-sm text-slate-600'><Check size={16} className='mt-0.5 shrink-0 text-indigo-600' aria-hidden='true' />{item}</li>)}</ul><Link href='#contact' className={`mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 text-sm font-semibold ${featured ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border border-slate-300 text-slate-800 hover:bg-slate-50'}`}>Discuss your workflow <ArrowRight size={15} className='ml-2' aria-hidden='true' /></Link></article>)}</div><p className='mt-5 text-center text-xs text-slate-500'>Illustrative scopes only. No prices or final package commitments are being advertised.</p></div></section>
}

function FAQ() {
  return <section id='faq' className='scroll-mt-20 bg-[#F6F7FC] py-20 sm:py-24'><div className='mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20 lg:px-10'><div><p className='text-xs font-bold tracking-[0.18em] text-indigo-700 uppercase'>Good to know</p><h2 className='mt-4 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl'>Questions, answered.</h2><p className='mt-4 max-w-sm text-base leading-7 text-slate-600'>A few details about the current JurisMind preview and what to expect.</p></div><div className='divide-y divide-slate-200 border-y border-slate-200'>{questions.map(({ question, answer }) => <details key={question} className='group py-5'><summary className='flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 sm:text-base'><span>{question}</span><ChevronDown size={18} className='shrink-0 text-slate-500 transition group-open:rotate-180' aria-hidden='true' /></summary><p className='max-w-2xl pt-3 pr-8 text-sm leading-6 text-slate-600'>{answer}</p></details>)}</div></div></section>
}

function ClosingCTA() {
  return <section id='contact' className='scroll-mt-20 bg-slate-950 px-5 py-16 text-white sm:px-8 sm:py-20 lg:px-10'><div className='mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-[2rem] border border-white/10 bg-[#10152B] p-7 sm:p-10 lg:flex-row lg:items-center lg:p-14'><div className='max-w-2xl'><p className='text-xs font-bold tracking-[0.18em] text-indigo-300 uppercase'>Make room for better work</p><h2 className='mt-4 text-3xl leading-tight font-semibold tracking-[-0.035em] sm:text-4xl'>Bring your legal work into one clear view.</h2><p className='mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base'>Explore the sample workspace and see how matters, clients, and day-to-day operations can come together.</p></div><div className='flex w-full flex-col gap-3 sm:w-auto sm:flex-row'><Link href='/dashboard' className='inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'>Explore the preview <ArrowRight size={16} aria-hidden='true' /></Link><Link href='#faq' className='inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'>Read preview notes</Link></div></div></section>
}

function Footer() {
  return <footer className='bg-slate-950 px-5 pb-8 text-white sm:px-8 lg:px-10'><div className='mx-auto max-w-7xl border-t border-white/10 pt-10'><div className='grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]'><div><Wordmark inverse /><p className='mt-4 max-w-xs text-sm leading-6 text-slate-400'>A clearer workspace for matters, clients, and the work that connects them.</p><span className='mt-4 inline-flex rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-medium text-slate-400'>Product preview</span></div><div><h3 className='text-xs font-semibold tracking-wider text-slate-300 uppercase'>Platform</h3><ul className='mt-4 space-y-3 text-sm text-slate-400'><li><Link className='hover:text-white' href='#features'>Capabilities</Link></li><li><Link className='hover:text-white' href='#workflow'>How it works</Link></li><li><Link className='hover:text-white' href='#plans'>Example plans</Link></li></ul></div><div><h3 className='text-xs font-semibold tracking-wider text-slate-300 uppercase'>Explore</h3><ul className='mt-4 space-y-3 text-sm text-slate-400'><li><Link className='hover:text-white' href='/dashboard'>Sample workspace</Link></li><li><Link className='hover:text-white' href='#faq'>FAQ</Link></li><li><Link className='hover:text-white' href='#contact'>Contact details</Link></li></ul></div><div><h3 className='text-xs font-semibold tracking-wider text-slate-300 uppercase'>JurisMind</h3><p className='mt-4 text-sm leading-6 text-slate-400'>Under development. Preview screens use sample data and are not connected to live firm records.</p></div></div><div className='mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between'><span>© {new Date().getFullYear()} JurisMind. All rights reserved.</span><span>Illustrative interface · Sample records · Pricing not finalized</span></div></div></footer>
}

export function MarketingHome() {
  return <main className='marketing-home min-h-screen w-full min-w-0 flex-1 bg-white text-slate-900'><Navigation /><Hero /><CapabilitiesStrip /><Features /><WorkflowSections /><Plans /><FAQ /><ClosingCTA /><Footer /></main>
}




