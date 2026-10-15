// Third-party Imports
import { EllipsisVerticalIcon } from 'lucide-react'

// Component Imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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

type TeamsProps = {
  className?: string
}

const { teamActions, teams } = db

function Teams({ className }: TeamsProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className='flex items-center justify-between'>
        <span className='text-lg font-medium'>Teams</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant='ghost' size='icon' className='text-muted-foreground size-6 rounded-full' />}
          >
            <EllipsisVerticalIcon />
            <span className='sr-only'>Menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-32'>
            <DropdownMenuGroup>
              {teamActions.map((item, index) => (
                <DropdownMenuItem key={index}>{item}</DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className='flex flex-1 flex-col justify-between gap-4'>
        {teams.map(team => (
          <div key={team.id} className='flex items-center justify-between gap-2'>
            <div className='flex items-center justify-between gap-4'>
              <Avatar size='lg'>
                {team.avatar ? <AvatarImage src={team.avatar} alt={team.teams} /> : null}
                <AvatarFallback>{team.initials}</AvatarFallback>
              </Avatar>
              <div className='flex flex-col gap-0.5'>
                <span className='text-base font-medium'>{team.teams}</span>
                <span className='text-muted-foreground text-sm'>{team.totalMembers}</span>
              </div>
            </div>
            <Badge variant='outline' className='h-6 px-2 py-1'>
              {team.teamBadge.label}
            </Badge>
          </div>
        ))}
      </CardContent>
      <CardContent>
        <Button variant='outline' className='w-full'>
          View All Teams
        </Button>
      </CardContent>
    </Card>
  )
}

export default Teams
