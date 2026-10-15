// Third-party Imports
import { EllipsisVerticalIcon, UserIcon, UserRoundCheckIcon } from 'lucide-react'

// Components Imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

// Data Imports
import { db } from '@/fake-db/pages/user-profile'

// Util Imports
import { cn } from '@/lib/utils'

type ConnectionsProps = {
  className?: string
}

const { connectionActions, connections } = db

function Connections({ className }: ConnectionsProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className='flex items-center justify-between'>
        <span className='text-lg font-medium'>Connections</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant='ghost' size='icon' className='text-muted-foreground size-6 rounded-full' />}
          >
            <EllipsisVerticalIcon />
            <span className='sr-only'>Menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-32'>
            <DropdownMenuGroup>
              {connectionActions.map((item, index) => (
                <DropdownMenuItem key={index}>{item}</DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className='flex flex-1 flex-col justify-between gap-4'>
        {connections.map(connection => (
          <div key={connection.id} className='flex items-center justify-between gap-2'>
            <div className='flex items-center justify-between gap-4'>
              <Avatar size='lg'>
                {connection.avatar ? <AvatarImage src={connection.avatar} alt={connection.name} /> : null}
                <AvatarFallback>{connection.initials}</AvatarFallback>
              </Avatar>
              <div className='flex flex-col gap-0.5'>
                <span className='text-base font-medium'>{connection.name}</span>
                <span className='text-muted-foreground text-sm'>{connection.totalConnections}</span>
              </div>
            </div>
            <Button size='icon' variant={connection.isConnected ? 'default' : 'outline'}>
              {connection.isConnected ? <UserRoundCheckIcon /> : <UserIcon />}
            </Button>
          </div>
        ))}
      </CardContent>
      <CardContent>
        <Button variant='outline' className='w-full'>
          View All Connections
        </Button>
      </CardContent>
    </Card>
  )
}

export default Connections
