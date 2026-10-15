// React Imports
import type { ReactNode } from 'react'

const BlankLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className='h-full w-full'>
      <div className='border-b bg-muted/50 px-4 py-2 text-center text-xs text-muted-foreground'>
        UI preview only. Sign-in and account forms are not connected to authentication.
      </div>
      {children}
    </div>
  )
}

export default BlankLayout
