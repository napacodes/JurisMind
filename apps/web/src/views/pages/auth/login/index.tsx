import Link from 'next/link'
import Logo from '@/components/shared/Logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import LoginForm from './login-form'

export default function Login({ returnTo = '/workspaces' }: { returnTo?: string }) {
  return (
    <main className='grid min-h-[calc(100vh-2.5rem)] place-items-center px-4 py-12 sm:px-6'>
      <Card className='w-full max-w-md gap-6 p-6 sm:p-8'>
        <CardHeader className='gap-5 p-0'>
          <Link href='/' aria-label='JurisMind home'><Logo className='gap-3' /></Link>
          <div className='space-y-2'>
            <CardTitle className='text-2xl'>Sign in to JurisMind</CardTitle>
            <CardDescription>Use your existing JurisMind account to continue to your workspace.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className='space-y-5 p-0'>
          <LoginForm returnTo={returnTo} />
          <p className='text-center text-xs text-muted-foreground'>Account creation and password recovery are not available here.</p>
          <p className='text-center text-sm'><Link className='text-primary underline-offset-4 hover:underline' href='/'>Return to JurisMind</Link></p>
        </CardContent>
      </Card>
    </main>
  )
}
