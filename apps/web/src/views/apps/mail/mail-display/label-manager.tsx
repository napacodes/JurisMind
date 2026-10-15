// Third-party Imports
import { CheckIcon, Tag } from 'lucide-react'

// Type Imports
import type { EmailLabel } from '@/types/apps/mail-types'

// Component Imports
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// Config Imports
import { MAIL_LABEL_NAV_ITEMS, MAIL_LABEL_STYLES } from '@/configs/mailConfig'

// Util Imports
import { cn } from '@/lib/utils'

export const LabelManager = ({ labels }: { labels: EmailLabel[] }) => {
  // Props

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant='ghost' size='icon' title='Manage labels'>
            <Tag className='size-4' />
            <span className='sr-only'>Manage labels</span>
          </Button>
        }
      />
      <PopoverContent align='start' className='flex w-40 flex-col gap-1 p-1'>
        {MAIL_LABEL_NAV_ITEMS.map(labelItem => {
          const labelStyle = MAIL_LABEL_STYLES.find(labelStyleItem => labelStyleItem.id === labelItem.id)
          const isActive = labels.includes(labelItem.id)

          return (
            <Button
              key={labelItem.id}
              type='button'
              variant='ghost'
              size='sm'
              title={labelItem.label}
              className='w-full justify-start gap-2'
            >
              <span className={cn('size-2.5 shrink-0 rounded-full', labelStyle?.color)} />
              <span className='flex-1 text-left'>{labelItem.label}</span>
              {isActive && <CheckIcon className='size-4 shrink-0' />}
            </Button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
