'use client'

// React Imports
import { useState } from 'react'

// Third-party Imports
import { ChevronLeftIcon, ChevronRightIcon, EllipsisVerticalIcon } from 'lucide-react'

// Type Imports
import type { UserProject } from '@/types/apps/user-types'

// Component Imports
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from '@/components/ui/pagination'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// Util Imports
import { cn } from '@/lib/utils'

const PROJECT_PROGRESS_COLORS = [
  '**:data-[slot=progress-indicator]:bg-chart-1',
  '**:data-[slot=progress-indicator]:bg-chart-2',
  '**:data-[slot=progress-indicator]:bg-chart-3',
  '**:data-[slot=progress-indicator]:bg-chart-5'
]

const PROJECT_LOGO_COLORS = [
  'bg-primary/10 text-primary',
  'bg-chart-1/10 text-chart-1',
  'bg-chart-2/10 text-chart-2',
  'bg-chart-3/10 text-chart-3'
]

const getProjectInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const getProjectLogoColor = (id: string): string => {
  const hash = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)

  return PROJECT_LOGO_COLORS[hash % PROJECT_LOGO_COLORS.length]
}

const getProjectProgressColor = (id: string): string => {
  const hash = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)

  return PROJECT_PROGRESS_COLORS[hash % PROJECT_PROGRESS_COLORS.length]
}

function ProjectTeamAvatars({ project }: { project: UserProject }) {
  const visibleTeam = project.team.slice(0, 3)

  return (
    <AvatarGroup>
      {visibleTeam.map((member, index) => (
        <Avatar key={`${project.id}-team-${index}`} className='ring-background ring-2' size='sm'>
          {member.avatar ? <AvatarImage src={member.avatar} alt={member.initials} /> : null}
          <AvatarFallback className='text-[10px]'>{member.initials}</AvatarFallback>
        </Avatar>
      ))}
      {project.teamExtraCount ? <AvatarGroupCount>+{project.teamExtraCount}</AvatarGroupCount> : null}
    </AvatarGroup>
  )
}

export interface ProjectsDatatableProps {
  search: string
  projects: UserProject[]
  totalProjects: number
  showingFrom: number
  showingTo: number
  currentPage: number
  totalPages: number
  pages: number[]
  showLeftEllipsis: boolean
  showRightEllipsis: boolean
  onSearchChange: (value: string) => void
  onPageChange: (page: number) => void
}

export function ProjectsDatatable({
  search,
  projects,
  totalProjects,
  showingFrom,
  showingTo,
  currentPage,
  totalPages,
  pages,
  showLeftEllipsis,
  showRightEllipsis,
  onSearchChange,
  onPageChange
}: ProjectsDatatableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const allSelected = projects.length > 0 && projects.every(project => selectedIds.has(project.id))
  const someSelected = projects.some(project => selectedIds.has(project.id)) && !allSelected

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(projects.map(project => project.id)))

      return
    }

    setSelectedIds(new Set())
  }

  const handleSelectRow = (projectId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)

      if (checked) {
        next.add(projectId)
      } else {
        next.delete(projectId)
      }

      return next
    })
  }

  const handleSearchChange = (value: string) => {
    setSelectedIds(new Set())
    onSearchChange(value)
  }

  const handlePageChange = (page: number) => {
    setSelectedIds(new Set())
    onPageChange(page)
  }

  return (
    <div className='w-full'>
      <div className='border-b'>
        <div className='flex min-h-17 flex-wrap items-center justify-between gap-3 px-4 py-3'>
          <span className='text-lg font-medium'>Projects List</span>
          <div>
            <Label htmlFor='search-projects' className='sr-only'>
              Search projects
            </Label>
            <Input
              id='search-projects'
              value={search}
              onChange={event => handleSearchChange(event.target.value)}
              placeholder='Search project'
              type='text'
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className='h-17 border-t'>
              <TableHead className='text-muted-foreground w-12.5 pl-4'>
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={value => handleSelectAll(!!value)}
                  aria-label='Select all projects'
                />
              </TableHead>
              <TableHead className='text-muted-foreground'>Project</TableHead>
              <TableHead className='text-muted-foreground'>Leader</TableHead>
              <TableHead className='text-muted-foreground'>Team</TableHead>
              <TableHead className='text-muted-foreground'>Progress</TableHead>
              <TableHead className='text-muted-foreground w-12 px-4 text-right'>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className='text-center'>
                  No projects found
                </TableCell>
              </TableRow>
            ) : (
              projects.map(project => (
                <TableRow key={project.id}>
                  <TableCell className='w-12.5 pl-4'>
                    <Checkbox
                      checked={selectedIds.has(project.id)}
                      onCheckedChange={value => handleSelectRow(project.id, !!value)}
                      aria-label={`Select ${project.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className='flex items-center gap-4'>
                      <Avatar className='size-8 rounded-md after:border-none'>
                        {project.logo ? (
                          <AvatarImage src={project.logo} alt={project.name} className='rounded-md object-cover' />
                        ) : null}
                        <AvatarFallback className={cn('rounded-md text-xs', getProjectLogoColor(project.id))}>
                          {getProjectInitials(project.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className='flex flex-col gap-1'>
                        <span>{project.name}</span>
                        <span className='text-muted-foreground text-xs'>{project.type}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className='text-muted-foreground'>{project.leader}</span>
                  </TableCell>
                  <TableCell>
                    <ProjectTeamAvatars project={project} />
                  </TableCell>
                  <TableCell className='w-40'>
                    <div className='flex items-center gap-3'>
                      <Progress
                        value={project.progress}
                        className={cn('w-40 *:data-[slot=progress-track]:h-1.5', getProjectProgressColor(project.id))}
                      />
                      <span className='text-muted-foreground'>{project.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className='px-4 text-right'>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant='ghost' size='icon' aria-label='Project actions' />}>
                        <EllipsisVerticalIcon />
                        <span className='sr-only'>Menu</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuGroup>
                          <DropdownMenuItem>View</DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalProjects > 0 && (
        <div className='flex items-center justify-between gap-3 px-6 py-4 max-sm:flex-col md:max-lg:flex-col'>
          <p className='text-muted-foreground text-sm whitespace-nowrap' aria-live='polite'>
            Showing <span>{showingFrom}</span> to <span>{showingTo}</span> of <span>{totalProjects}</span> entries
          </p>

          <div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    className='disabled:pointer-events-none disabled:opacity-50'
                    variant='ghost'
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    aria-label='Go to previous page'
                  >
                    <ChevronLeftIcon aria-hidden='true' />
                    Previous
                  </Button>
                </PaginationItem>

                {showLeftEllipsis && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

                {pages.map(page => {
                  const isActive = page === currentPage

                  return (
                    <PaginationItem key={page}>
                      <Button
                        size='icon'
                        className={`${!isActive && 'bg-primary/10 text-primary hover:bg-primary/20 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40'}`}
                        onClick={() => handlePageChange(page)}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {page}
                      </Button>
                    </PaginationItem>
                  )
                })}

                {showRightEllipsis && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

                <PaginationItem>
                  <Button
                    className='disabled:pointer-events-none disabled:opacity-50'
                    variant='ghost'
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    aria-label='Go to next page'
                  >
                    Next
                    <ChevronRightIcon aria-hidden='true' />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </div>
  )
}
