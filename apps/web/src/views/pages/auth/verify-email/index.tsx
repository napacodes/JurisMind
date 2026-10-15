// Next Imports
import Link from 'next/link'

// Component Import
import Logo from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// SVG Import
import AuthBackgroundShape from '@/assets/svg/auth-background-shape'

const VerifyEmail = () => {
  return (
    <div className='relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
      <div className='absolute'>
        <AuthBackgroundShape />
      </div>

      <Card className='z-1 w-full gap-6 py-6 sm:max-w-md'>
        <CardHeader className='gap-6 px-6'>
          <Link href='/'>
            <Logo className='justify-center gap-3' />
          </Link>

          <div className='text-center'>
            <CardTitle className='mb-2 text-2xl font-semibold'>Verify your email</CardTitle>
            <CardDescription className='text-base'>
              An activation link has been sent to your email address: hello@example.com. Please check your inbox and
              click on the link to complete the activation process.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className='px-6'>
          <div className='space-y-4'>
            <Button className='w-full' render={<Link href='#' />} nativeButton={false}>
              Skip for now
            </Button>

            <p className='text-muted-foreground text-center text-base'>
              Didn&apos;t get the mail?{' '}
              <Link href='#' className='text-card-foreground hover:underline'>
                Resend
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default VerifyEmail
