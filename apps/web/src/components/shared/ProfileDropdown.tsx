'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOutIcon, UserIcon } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { api, ApiError } from '@/lib/api'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'JM'

const ProfileDropdown = () => {
  const { user, clear } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const logout = async () => {
    setError(null)
    try {
      await api.logout()
    } catch (reason) {
      if (!(reason instanceof ApiError && reason.status === 401)) {
        setError('Could not reach the service to end your session. Try again when connected.')
        return
      }
    }
    clear()
    router.replace('/')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant='ghost' size='icon' aria-label='Account menu' className='relative rounded-full hover:bg-transparent' />}>
        <Avatar><AvatarFallback>{initials(user?.fullName ?? '')}</AvatarFallback></Avatar>
        <span className='ring-card absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2' />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-64'>
        <DropdownMenuGroup>
          <DropdownMenuLabel className='flex items-center gap-3 px-2 py-2.5 font-normal'>
            <Avatar className='size-10'><AvatarFallback>{initials(user?.fullName ?? '')}</AvatarFallback></Avatar>
            <span className='flex min-w-0 flex-col'><span className='truncate text-sm font-semibold'>{user?.fullName}</span><span className='truncate text-xs text-muted-foreground'>{user?.email}</span></span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/workspaces')}><UserIcon /><span>Choose workspace</span></DropdownMenuItem>
        {error && <DropdownMenuLabel className='whitespace-normal text-xs text-destructive' role='alert'>{error}</DropdownMenuLabel>}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant='destructive' onClick={() => void logout()}><LogOutIcon /><span>Sign out</span></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ProfileDropdown
