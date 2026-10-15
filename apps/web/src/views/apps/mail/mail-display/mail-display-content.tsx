'use client'

// React Imports
import { useState } from 'react'

// Third-party Imports
import {
  Archive,
  ChevronDown,
  Forward,
  Inbox,
  MoreVertical,
  Reply,
  ReplyAll,
  SendIcon,
  ShieldAlert,
  ShieldCheck,
  StarIcon,
  Trash2
} from 'lucide-react'

// Type Imports
import type { Email, ThreadMessage } from '@/types/apps/mail-types'

// Component Imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { LabelManager } from './label-manager'
import { MailThreadMessage } from './mail-thread-message'

// Config Imports
import { formatMailDate, getInitialsFromName, MAIL_CURRENT_USER, MAIL_LABEL_STYLES } from '@/configs/mailConfig'

// Util Imports
import { cn } from '@/lib/utils'

const LABEL_MANAGE_STATUSES = new Set<Email['status']>(['inbox', 'sent', 'archive'])

export const MailDisplayContent = ({ email }: { email: Email }) => {
  // States
  const [replyMessageBody, setReplyMessageBody] = useState(() => (email.status === 'drafts' ? email.body : ''))
  const [isEarlierMessagesExpanded, setIsEarlierMessagesExpanded] = useState(false)

  // Vars
  const threadMessages = email.thread.messages
  const earlierThreadMessages = threadMessages.slice(0, -1)
  const latestThreadMessage = threadMessages[threadMessages.length - 1]
  const earlierMessageCount = earlierThreadMessages.length

  const isDraft = email.status === 'drafts'
  const isSent = email.status === 'sent'
  const canManageLabels = LABEL_MANAGE_STATUSES.has(email.status)

  const recipientName = isSent || isDraft ? (email.to ?? 'Unknown') : email.from
  const recipientEmail = isSent || isDraft ? (email.toEmail ?? '') : email.fromEmail

  const getThreadMessageAvatar = (message: ThreadMessage) => {
    if (message.isFromMe) {
      return MAIL_CURRENT_USER.avatar
    }

    if (message.from === email.from) {
      return email.avatar
    }

    return undefined
  }

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='flex items-center gap-1 p-1 max-lg:justify-end lg:h-15 lg:p-3'>
        <div className='hidden items-center lg:flex'>
          {(email.status === 'inbox' || email.status === 'sent' || email.status === 'drafts') && (
            <Tooltip>
              <TooltipTrigger render={<Button variant='ghost' size='icon' title='Archive' />}>
                <Archive className='size-4' />
                <span className='sr-only'>Archive</span>
              </TooltipTrigger>
              <TooltipContent>Archive</TooltipContent>
            </Tooltip>
          )}

          {email.status === 'inbox' && (
            <Tooltip>
              <TooltipTrigger render={<Button variant='ghost' size='icon' title='Move to spam' />}>
                <ShieldAlert className='size-4' />
                <span className='sr-only'>Move to spam</span>
              </TooltipTrigger>
              <TooltipContent>Move to spam</TooltipContent>
            </Tooltip>
          )}

          {email.status === 'spam' && (
            <Tooltip>
              <TooltipTrigger render={<Button variant='ghost' size='icon' title='Not spam' />}>
                <ShieldCheck className='size-4' />
                <span className='sr-only'>Not spam</span>
              </TooltipTrigger>
              <TooltipContent>Not spam</TooltipContent>
            </Tooltip>
          )}

          {(email.status === 'trash' || email.status === 'archive') && (
            <Tooltip>
              <TooltipTrigger render={<Button variant='ghost' size='icon' title='Restore to inbox' />}>
                <Inbox className='size-4' />
                <span className='sr-only'>Restore to inbox</span>
              </TooltipTrigger>
              <TooltipContent>Restore to inbox</TooltipContent>
            </Tooltip>
          )}

          {(email.status === 'inbox' ||
            email.status === 'sent' ||
            email.status === 'drafts' ||
            email.status === 'spam' ||
            email.status === 'archive') && (
            <Tooltip>
              <TooltipTrigger render={<Button variant='ghost' size='icon' title='Move to trash' />}>
                <Trash2 className='size-4' />
                <span className='sr-only'>Move to trash</span>
              </TooltipTrigger>
              <TooltipContent>Move to trash</TooltipContent>
            </Tooltip>
          )}

          {(email.status === 'spam' || email.status === 'trash') && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='ghost'
                    size='icon'
                    title='Delete permanently'
                    className='text-destructive hover:text-destructive'
                  />
                }
              >
                <Trash2 className='size-4' />
                <span className='sr-only'>Delete permanently</span>
              </TooltipTrigger>
              <TooltipContent>Delete permanently</TooltipContent>
            </Tooltip>
          )}

          {canManageLabels && <LabelManager labels={email.labels} />}
        </div>

        <Separator orientation='vertical' className='hidden h-6 data-vertical:self-center lg:block' />
        <div className='hidden min-w-0 flex-1 items-center gap-2 lg:flex'>
          <Tooltip>
            <TooltipTrigger render={<Button variant='ghost' size='icon' title={email.isStarred ? 'Unstar' : 'Star'} />}>
              <StarIcon className={cn('size-4', email.isStarred && 'fill-primary text-primary')} />
              <span className='sr-only'>{email.isStarred ? 'Unstar' : 'Star'}</span>
            </TooltipTrigger>
            <TooltipContent>{email.isStarred ? 'Unstar' : 'Star'}</TooltipContent>
          </Tooltip>
          {email.labels.length > 0 && (
            <div className='flex min-w-0 flex-wrap items-center gap-1.5'>
              {email.labels.map(label => {
                const labelStyle = MAIL_LABEL_STYLES.find(style => style.id === label)

                return (
                  <Badge key={label} variant='outline' className='px-1.5 max-xl:border-0 max-xl:p-0'>
                    <span className={cn('size-1.5 shrink-0 rounded-full', labelStyle?.color)} />
                    <span className='max-xl:hidden'>{label}</span>
                  </Badge>
                )
              })}
            </div>
          )}
        </div>

        <div className='flex shrink-0 items-center gap-0.5'>
          <Tooltip>
            <TooltipTrigger render={<Button variant='ghost' size='icon' disabled={isSent} />}>
              <Reply className='size-4' />
              <span className='sr-only'>Reply</span>
            </TooltipTrigger>
            <TooltipContent>Reply</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<Button variant='ghost' size='icon' disabled={!email} />}>
              <ReplyAll className='size-4' />
              <span className='sr-only'>Reply all</span>
            </TooltipTrigger>
            <TooltipContent>Reply all</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<Button variant='ghost' size='icon' disabled={!email} />}>
              <Forward className='size-4' />
              <span className='sr-only'>Forward</span>
            </TooltipTrigger>
            <TooltipContent>Forward</TooltipContent>
          </Tooltip>
          <Separator orientation='vertical' className='mx-1 h-6 data-vertical:self-center' />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant='ghost' size='icon' />}>
              <MoreVertical className='size-4' />
              <span className='sr-only'>More</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem>{email.isRead ? 'Mark as unread' : 'Mark as read'}</DropdownMenuItem>
              <DropdownMenuItem>{email.isStarred ? 'Unstar thread' : 'Star thread'}</DropdownMenuItem>
              {(email.status === 'inbox' || email.status === 'sent' || email.status === 'drafts') && (
                <DropdownMenuItem>Archive</DropdownMenuItem>
              )}
              {email.status === 'inbox' && <DropdownMenuItem>Move to spam</DropdownMenuItem>}
              {email.status === 'spam' && <DropdownMenuItem>Not spam</DropdownMenuItem>}
              {(email.status === 'trash' || email.status === 'archive') && (
                <DropdownMenuItem>Restore to inbox</DropdownMenuItem>
              )}
              {email.status === 'drafts' && <DropdownMenuItem>Send draft</DropdownMenuItem>}
              {(email.status === 'inbox' ||
                email.status === 'sent' ||
                email.status === 'drafts' ||
                email.status === 'spam' ||
                email.status === 'archive') && <DropdownMenuItem variant='destructive'>Move to trash</DropdownMenuItem>}
              {(email.status === 'spam' || email.status === 'trash') && (
                <DropdownMenuItem variant='destructive'>Delete permanently</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Separator />

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        <div className='border-border border-b p-3'>
          <div className='flex items-start justify-between gap-4'>
            <div className='flex min-w-0 flex-1 items-start gap-3'>
              <Avatar size='lg' className='shrink-0 max-md:hidden'>
                {!isSent && !isDraft && <AvatarImage src={email.avatar} alt={email.from} />}
                <AvatarFallback>{getInitialsFromName(recipientName)}</AvatarFallback>
              </Avatar>
              <div className='min-w-0 flex-1'>
                <h2 className='text-foreground line-clamp-2 text-base leading-snug font-medium tracking-tight md:font-semibold'>
                  {email.subject}
                </h2>
                {isSent || isDraft ? (
                  <>
                    <p className='text-foreground mt-1 text-sm font-medium'>
                      <span className='text-muted-foreground font-normal'>To: </span>
                      {recipientName}
                    </p>
                    {recipientEmail && <p className='text-muted-foreground mt-0.5 text-xs'>{recipientEmail}</p>}
                  </>
                ) : (
                  <>
                    <p className='text-foreground mt-1 text-sm font-medium'>{email.from}</p>
                    <p className='text-muted-foreground mt-0.5 text-xs'>Reply-To: {email.fromEmail}</p>
                  </>
                )}
              </div>
            </div>
            <span className='text-muted-foreground shrink-0 pt-0.5 text-xs'>{formatMailDate(email.date)}</span>
          </div>
        </div>

        <div className='flex-1 overflow-auto p-3'>
          <div className='flex flex-col gap-5'>
            {earlierMessageCount > 0 && (
              <button
                type='button'
                className='text-muted-foreground hover:text-foreground flex w-full items-center gap-2 text-sm font-medium transition-colors'
                onClick={() => setIsEarlierMessagesExpanded(currentValue => !currentValue)}
              >
                <ChevronDown className={cn('size-4 transition-transform', isEarlierMessagesExpanded && 'rotate-180')} />
                {earlierMessageCount} earlier {earlierMessageCount === 1 ? 'message' : 'messages'}
              </button>
            )}

            {isEarlierMessagesExpanded &&
              earlierThreadMessages.map(threadMessage => (
                <MailThreadMessage
                  key={threadMessage.id}
                  message={threadMessage}
                  avatar={getThreadMessageAvatar(threadMessage)}
                />
              ))}

            {latestThreadMessage && (
              <MailThreadMessage
                message={latestThreadMessage}
                avatar={getThreadMessageAvatar(latestThreadMessage)}
                variant='plain'
              />
            )}
          </div>
        </div>

        <div className='border-border mt-auto border-t p-3'>
          <form onSubmit={event => event.preventDefault()}>
            <div className='border-border bg-muted/20 overflow-hidden rounded-lg border'>
              <Textarea
                className='resize-none rounded-none border-0 bg-transparent p-2 text-sm shadow-none focus-visible:ring-0 max-md:min-h-10 md:px-4 md:py-3'
                placeholder={isDraft ? 'Edit your draft...' : `Reply to ${recipientName}...`}
                value={replyMessageBody}
                onChange={event => setReplyMessageBody(event.target.value)}
              />
              <div className='border-border flex items-center justify-between border-t p-2 md:px-4 md:py-2.5'>
                <div className='flex items-center gap-2'>
                  <Switch id='mute-thread' />
                  <label htmlFor='mute-thread' className='text-muted-foreground text-sm'>
                    Mute this thread
                  </label>
                </div>
                <Button
                  type='submit'
                  variant='secondary'
                  size='sm'
                  title={isDraft ? 'Send draft' : 'Send reply'}
                  className='gap-1.5 rounded-lg px-4'
                  disabled={!replyMessageBody.trim()}
                >
                  Send
                  <SendIcon className='size-4' />
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
