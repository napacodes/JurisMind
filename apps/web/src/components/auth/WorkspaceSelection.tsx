'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, BriefcaseBusiness, ShieldCheck, Scale } from 'lucide-react'
import { AuthGate } from './AuthGate'
import { useAuth } from './AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function WorkspaceOptions() {
  const { user, workspaces } = useAuth()
  const router = useRouter()
  return (
    <main className='mx-auto w-full max-w-3xl px-4 py-12 sm:px-6'>
      <header className='mb-8'>
        <Link href='/' className='text-sm font-semibold text-primary hover:underline'>JurisMind</Link>
        <p className='mt-8 text-sm text-muted-foreground'>Signed in as {user?.email}</p>
        <h1 className='mt-2 text-3xl font-semibold tracking-tight'>Choose a workspace</h1>
        <p className='mt-2 text-muted-foreground'>This selection changes the workspace shown in the interface. The API still checks your access on every protected request.</p>
      </header>
      {workspaces.length ? <ul className='space-y-3' aria-label='Your active workspaces'>
        {workspaces.map((workspace) => {
          const Icon = workspace.kind === 'FIRM' ? BriefcaseBusiness : Scale
          return <li key={workspace.id}><Card><CardContent className='flex flex-col gap-4 p-5 sm:flex-row sm:items-center'>
            <span className='grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary'><Icon className='size-5' aria-hidden='true' /></span>
            <div className='min-w-0 flex-1'><p className='font-semibold'>{workspace.name}</p><p className='mt-1 text-sm text-muted-foreground'>{workspace.kind === 'FIRM' ? 'Firm' : 'Individual practice'} · {workspace.role.replace('_', ' ')}</p></div>
            <Button className='gap-2' onClick={() => router.replace(`/dashboard?workspaceId=${encodeURIComponent(workspace.id)}`)}>Open workspace <ArrowRight className='size-4' aria-hidden='true' /></Button>
            {workspace.permissions.includes('lawyer-credential:submit:self') && <Button variant='outline' nativeButton={false} render={<Link href={`/lawyer-verification?workspaceId=${encodeURIComponent(workspace.id)}`} />}>Credential status</Button>}
          </CardContent></Card></li>
        })}
      </ul> : <Card>
        <CardHeader><CardTitle>No active workspaces yet</CardTitle><CardDescription>Only active memberships are shown here. Pending invitations appear after acceptance through their invitation link.</CardDescription></CardHeader>
        <CardContent className='flex flex-col gap-3 sm:flex-row'><Button nativeButton={false} render={<Link href='/onboarding/individual' />}>Set up an individual practice</Button><Button nativeButton={false} variant='outline' render={<Link href='/invitations/accept' />}>Accept an invitation</Button></CardContent>
      </Card>}
      {user?.platformRoles?.includes('SUPER_ADMIN') && <Card className='mt-4 border-primary/30'>
        <CardHeader><CardTitle className='flex items-center gap-2'><ShieldCheck className='size-5 text-primary' />Platform administration</CardTitle><CardDescription>Manage platform accounts using your separate Super Admin grant.</CardDescription></CardHeader>
        <CardContent><Button nativeButton={false} render={<Link href='/administration/users' />}>Manage platform users <ArrowRight className='size-4' /></Button></CardContent>
      </Card>}
    </main>
  )
}

export default function WorkspaceSelection() {
  return <AuthGate><WorkspaceOptions /></AuthGate>
}
