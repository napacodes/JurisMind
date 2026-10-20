// React Imports
import { Suspense } from 'react'
import type { ReactNode } from 'react'

// Component Imports
import { ThemeProvider } from './ThemeProvider'
import { SidebarProvider } from './ui/sidebar'
import { Toaster } from './ui/sonner'
import { TooltipProvider } from './ui/tooltip'
import LoginSuccessToastConsumer from './auth/LoginSuccessToastConsumer'

type Props = {
  children: ReactNode
  sidebarDefaultOpen?: boolean
}

const Providers = ({ children, sidebarDefaultOpen }: Props) => {
  return (
    <ThemeProvider attribute='class' defaultTheme='system' enableSystem={true}>
      <TooltipProvider>
        <SidebarProvider defaultOpen={sidebarDefaultOpen}>
          {children}
          <Suspense fallback={null}><LoginSuccessToastConsumer /></Suspense>
          <Toaster closeButton />
        </SidebarProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default Providers
