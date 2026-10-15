// Third-party Imports
import { DownloadIcon, FileSpreadsheetIcon, FileTextIcon, PlusIcon, SearchIcon, UploadIcon } from 'lucide-react'

// Component Imports
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

const ROWS_PER_PAGE_ITEMS = ROWS_PER_PAGE_OPTIONS.map(option => ({
  label: String(option),
  value: String(option)
}))

export interface UserTableToolbarProps {
  search: string
  rowsPerPage: number
  onSearch: (search: string) => void
  onRowsPerPageChange: (rowsPerPage: number) => void
}

export function UserTableToolbar({ search, rowsPerPage, onSearch, onRowsPerPageChange }: UserTableToolbarProps) {
  return (
    <div className='flex gap-4 p-6 max-sm:flex-col sm:items-center sm:justify-between'>
      <div className='w-full max-w-2xs'>
        <Label htmlFor='search-user' className='sr-only'>
          Search User
        </Label>
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            id='search-user'
            value={search}
            onChange={event => onSearch(event.target.value)}
            placeholder='Search user'
            type='text'
          />
        </InputGroup>
      </div>

      <div className='flex flex-wrap items-center gap-2 sm:justify-between'>
        <div className='flex items-center gap-2'>
          <Label htmlFor='rows-per-page' className='sr-only'>
            Show
          </Label>
          <Select
            items={ROWS_PER_PAGE_ITEMS}
            value={String(rowsPerPage)}
            onValueChange={(value: string | null) => {
              if (value) {
                onRowsPerPageChange(Number(value))
              }
            }}
          >
            <SelectTrigger id='rows-per-page' className='w-fit whitespace-nowrap'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {ROWS_PER_PAGE_OPTIONS.map(option => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button className='bg-primary/10 text-primary hover:bg-primary/20 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40' />
            }
          >
            <UploadIcon />
            <span className='max-lg:hidden'>Export</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-auto'>
            <DropdownMenuItem>
              <FileTextIcon className='size-4' />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileSpreadsheetIcon className='size-4' />
              Export as Excel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <FileTextIcon className='size-4' />
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant='outline'>
          <DownloadIcon className='size-4' />
          <span className='max-lg:hidden'>Import</span>
        </Button>

        <Button>
          <PlusIcon />
          <span className='max-lg:hidden'>Add New User</span>
        </Button>
      </div>
    </div>
  )
}
