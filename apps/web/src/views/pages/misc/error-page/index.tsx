// React Imports
import Link from 'next/link'

// Component Imports
import { Button } from '@/components/ui/button'

const NotFound = () => {
  return (
    <div className='flex h-screen w-screen flex-col items-center justify-center gap-9 p-6'>
      <h1 className='text-9xl font-bold'>4&#129396;4</h1>
      <div className='flex flex-col items-center gap-4 text-center'>
        <p className='text-muted-foreground text-xl sm:text-2xl'>We couldn&apos;t find the page you are looking for</p>
        <Button className='rounded-full' render={<Link href='/' />} nativeButton={false}>
          Go back to home
        </Button>
      </div>
    </div>
  )
}

export default NotFound
