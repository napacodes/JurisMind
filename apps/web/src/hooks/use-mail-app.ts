'use client'

// React Imports
import { useCallback, useMemo, useState } from 'react'

// Type Imports
import type { Email, EmailLabel, EmailStatus, MailFilterTab, MailNavType } from '@/types/apps/mail-types'

// Data Imports
import { db } from '@/fake-db/apps/mail'

export const useMailApp = () => {
  // States
  const [emails] = useState<Email[]>(db)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeStatus, setActiveStatus] = useState<EmailStatus>('inbox')
  const [activeLabel, setActiveLabel] = useState<EmailLabel | null>(null)
  const [activeNavType, setActiveNavType] = useState<MailNavType>('status')
  const [filterTab, setFilterTab] = useState<MailFilterTab>('all')

  const statusCounts = useMemo(() => {
    const counts: Record<EmailStatus, number> = {
      inbox: 0,
      sent: 0,
      drafts: 0,
      spam: 0,
      trash: 0,
      archive: 0
    }

    for (const email of emails) {
      counts[email.status] += 1
    }

    return counts
  }, [emails])

  const labelCounts = useMemo(() => {
    const counts: Record<EmailLabel, number> = {
      social: 0,
      updates: 0,
      forums: 0,
      shopping: 0,
      promotions: 0
    }

    for (const email of emails) {
      if (email.status === 'inbox') {
        for (const label of email.labels) {
          counts[label] += 1
        }
      }
    }

    return counts
  }, [emails])

  const filteredEmails = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase()

    return emails.filter(email => {
      if (activeNavType === 'label') {
        if (email.status !== 'inbox' || !activeLabel || !email.labels.includes(activeLabel)) {
          return false
        }
      } else if (email.status !== activeStatus) {
        return false
      }

      if (!normalizedSearchQuery) {
        return true
      }

      return (
        email.subject.toLowerCase().includes(normalizedSearchQuery) ||
        email.from.toLowerCase().includes(normalizedSearchQuery) ||
        email.preview.toLowerCase().includes(normalizedSearchQuery) ||
        email.body.toLowerCase().includes(normalizedSearchQuery)
      )
    })
  }, [activeLabel, activeNavType, activeStatus, emails, searchQuery])

  const visibleEmails = useMemo(() => {
    if (filterTab === 'unread') {
      return filteredEmails.filter(email => !email.isRead)
    }

    return filteredEmails
  }, [filterTab, filteredEmails])

  const selectedEmail = useMemo(() => {
    if (selectedEmailId) {
      const selectedEmail = emails.find(email => email.id === selectedEmailId)

      if (selectedEmail && visibleEmails.some(email => email.id === selectedEmail.id)) {
        return selectedEmail
      }
    }

    return visibleEmails[0] ?? null
  }, [emails, selectedEmailId, visibleEmails])

  const unreadCount = useMemo(() => filteredEmails.filter(email => !email.isRead).length, [filteredEmails])

  const handleStatusChange = useCallback((status: EmailStatus) => {
    setActiveNavType('status')
    setActiveStatus(status)
    setActiveLabel(null)
    setSelectedEmailId(null)
  }, [])

  const handleLabelChange = useCallback((label: EmailLabel) => {
    setActiveNavType('label')
    setActiveLabel(label)
    setSelectedEmailId(null)
  }, [])

  const handleEmailSelect = useCallback((email: Email) => {
    setSelectedEmailId(email.id)
  }, [])

  return {
    activeStatus,
    activeLabel,
    activeNavType,
    filterTab,
    searchQuery,
    statusCounts,
    labelCounts,
    visibleEmails,
    selectedEmail,
    unreadCount,
    setFilterTab,
    setSearchQuery,
    handleStatusChange,
    handleLabelChange,
    handleEmailSelect
  }
}
