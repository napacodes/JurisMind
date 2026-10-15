export type ThreadMessage = {
  id: string
  from: string
  fromEmail: string
  body: string
  date: Date
  isFromMe?: boolean
}

export type EmailLabel = 'social' | 'updates' | 'forums' | 'shopping' | 'promotions'

export type EmailStatus = 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash' | 'archive'

export type Email = {
  id: string
  from: string
  fromEmail: string
  to?: string
  toEmail?: string
  cc?: string
  bcc?: string
  avatar?: string
  subject: string
  preview: string
  body: string
  date: Date
  isRead: boolean
  isStarred: boolean
  labels: EmailLabel[]
  status: EmailStatus
  thread: {
    messages: ThreadMessage[]
  }
}

export type MailData = {
  emails: Email[]
}

export type MailFilterTab = 'all' | 'unread'

export type MailNavType = 'status' | 'label'
