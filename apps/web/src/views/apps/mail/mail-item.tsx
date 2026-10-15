// Third-party Imports
import { StarIcon } from 'lucide-react'

// Type Imports
import type { Email } from '@/types/apps/mail-types'

// Component Imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// Config Imports
import { formatMailDate, getInitialsFromName, MAIL_LABEL_STYLES } from '@/configs/mailConfig'

// Util Imports
import { cn } from '@/lib/utils'

interface MailItemProps {
  email: Email
  isSelected: boolean
  onClick: () => void
}

const MailItem = ({ email, isSelected, onClick }: MailItemProps) => {
  // Props

  // Vars
  const threadMessageCount = email.thread.messages.length

  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'relative flex w-full items-start gap-3 rounded-md border border-transparent p-3 text-left text-sm transition-colors',
        isSelected ? 'bg-accent border-border' : 'hover:bg-muted/40',
        !email.isRead && ''
      )}
    >
      <Avatar className='size-10 shrink-0'>
        <AvatarImage src={email.avatar} alt={email.from} />
        <AvatarFallback>{getInitialsFromName(email.from)}</AvatarFallback>
      </Avatar>
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <div className='flex items-center gap-2'>
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-sm',
              !email.isRead ? 'text-foreground font-semibold' : 'text-foreground/80'
            )}
          >
            {email.from}
          </span>
          {email.isStarred && <StarIcon className='fill-primary text-primary size-3.5 shrink-0' />}
          <span className='text-muted-foreground shrink-0 text-[11px] tabular-nums'>{formatMailDate(email.date)}</span>
        </div>
        <p
          className={cn(
            'line-clamp-1 flex items-center justify-between gap-1 text-xs leading-snug',
            !email.isRead ? 'text-foreground font-semibold' : 'text-foreground/75'
          )}
        >
          <span>
            {email.subject}
            {threadMessageCount > 1 && (
              <span className='text-muted-foreground ml-1 font-normal'>({threadMessageCount})</span>
            )}
          </span>
          {email.labels.length > 0 && (
            <span className='flex flex-1 justify-end gap-1'>
              {email.labels.map(label => {
                const labelStyle = MAIL_LABEL_STYLES.find(style => style.id === label)

                return <span key={label} className={cn('size-1.5 shrink-0 rounded-full', labelStyle?.color)}></span>
              })}
            </span>
          )}
        </p>
        <p className='text-muted-foreground line-clamp-1 text-[11px] leading-relaxed'>{email.preview}</p>
      </div>
    </button>
  )
}

export default MailItem
