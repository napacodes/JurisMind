'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { consumeLoginSuccessToast, LOGIN_SUCCESS_TOAST_MESSAGE } from '@/lib/login-success-toast'

export default function LoginSuccessToastConsumer() {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const currentRoute = `${pathname}${search ? `?${search}` : ''}`

  useEffect(() => {
    if (!consumeLoginSuccessToast(currentRoute)) return
    toast.success(LOGIN_SUCCESS_TOAST_MESSAGE, {
      duration: 6000,
      closeButton: true,
      className: 'rounded-lg border border-border bg-popover text-popover-foreground shadow-lg',
    })
  }, [currentRoute])

  return null
}