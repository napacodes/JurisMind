// Third-party Imports
import type { LucideIcon } from 'lucide-react'
import { ArchiveIcon, ArchiveXIcon, FileIcon, InboxIcon, SendIcon, TrashIcon } from 'lucide-react'

// Type Imports
import type { EmailLabel, EmailStatus, MailNavType } from '@/types/apps/mail-types'

// Component Imports
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// Config Imports
import {
  MAIL_LABEL_STYLES,
  type MailNavLabelItemWithCount,
  type MailNavStatusItemWithCount
} from '@/configs/mailConfig'

// Util Imports
import { cn } from '@/lib/utils'

const statusIcons: Record<EmailStatus, LucideIcon> = {
  inbox: InboxIcon,
  sent: SendIcon,
  drafts: FileIcon,
  spam: ArchiveXIcon,
  trash: TrashIcon,
  archive: ArchiveIcon
}

interface MailNavProps {
  statusNavItems: MailNavStatusItemWithCount[]
  labelNavItems: MailNavLabelItemWithCount[]
  activeStatus: EmailStatus
  activeLabel: EmailLabel | null
  activeNavType: MailNavType
  onStatusChange: (status: EmailStatus) => void
  onLabelChange: (label: EmailLabel) => void
}

const MailNav = ({
  statusNavItems,
  labelNavItems,
  activeStatus,
  activeLabel,
  activeNavType,
  onStatusChange,
  onLabelChange
}: MailNavProps) => {
  // Props

  return (
    <div className='flex flex-1 flex-col gap-4 overflow-auto p-3 max-lg:pt-0'>
      <div>
        <p className='text-muted-foreground px-2 pb-2.5 text-[11px] font-medium uppercase'>Mailboxes</p>
        <nav className='grid gap-1'>
          {statusNavItems.map(statusItem => {
            const StatusIcon = statusIcons[statusItem.id]
            const isStatusActive = activeNavType === 'status' && activeStatus === statusItem.id

            return (
              <Tooltip key={statusItem.id}>
                <TooltipTrigger
                  render={
                    <Button
                      variant='ghost'
                      className={cn(
                        'justify-start gap-2.5 px-3',
                        isStatusActive
                          ? 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground'
                          : 'text-foreground/80 hover:bg-muted/60'
                      )}
                      onClick={() => onStatusChange(statusItem.id)}
                    />
                  }
                >
                  <StatusIcon className='size-4 shrink-0 opacity-70' />
                  {statusItem.label}
                  {statusItem.count > 0 && (
                    <span className='text-muted-foreground ml-auto text-xs tabular-nums'>{statusItem.count}</span>
                  )}
                </TooltipTrigger>
                <TooltipContent side='right' className='flex items-center gap-2'>
                  {statusItem.label}
                  {statusItem.count > 0 && <span className='text-primary-foreground ml-auto'>{statusItem.count}</span>}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>
      </div>

      <Separator />

      <div>
        <p className='text-muted-foreground px-2 pb-2.5 text-[11px] font-medium uppercase'>Labels</p>
        <nav className='grid gap-1'>
          {labelNavItems.map(labelItem => {
            const labelStyle = MAIL_LABEL_STYLES.find(labelStyleItem => labelStyleItem.id === labelItem.id)
            const isLabelActive = activeNavType === 'label' && activeLabel === labelItem.id

            return (
              <Tooltip key={labelItem.id}>
                <TooltipTrigger
                  render={
                    <Button
                      variant='ghost'
                      className={cn(
                        'justify-start gap-2.5 px-3',
                        isLabelActive
                          ? 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground'
                          : 'text-foreground/80 hover:bg-muted/60'
                      )}
                      onClick={() => onLabelChange(labelItem.id)}
                    />
                  }
                >
                  <span className={cn('size-2 shrink-0 rounded-full', labelStyle?.color)} />
                  {labelItem.label}
                  {labelItem.count > 0 && (
                    <span className='text-muted-foreground ml-auto text-xs tabular-nums'>{labelItem.count}</span>
                  )}
                </TooltipTrigger>
                <TooltipContent side='right' className='flex items-center gap-2'>
                  {labelItem.label}
                  {labelItem.count > 0 && <span className='text-primary-foreground ml-auto'>{labelItem.count}</span>}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export default MailNav
