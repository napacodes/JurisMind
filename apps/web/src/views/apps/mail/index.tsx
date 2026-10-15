'use client'

// React Imports
import { useMemo, useState } from 'react'

// Third-party Imports
import { ArrowDownUpIcon, ChevronLeftIcon, MailIcon, MenuIcon, SearchIcon } from 'lucide-react'

// Type Imports
import type { Email } from '@/types/apps/mail-types'

// Component Imports
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import MailNav from './mail-nav'
import MailList from './mail-list'
import MailDisplay from './mail-display'

// Config Imports
import { MAIL_LABEL_NAV_ITEMS, MAIL_STATUS_NAV_ITEMS } from '@/configs/mailConfig'

// Hook Imports
import { useMailApp } from '@/hooks/use-mail-app'

// Util Imports
import { cn } from '@/lib/utils'

const MailApp = () => {
  // States
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')

  // Hooks
  const {
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
  } = useMailApp()

  const statusNavItems = useMemo(
    () =>
      MAIL_STATUS_NAV_ITEMS.map(statusItem => ({
        ...statusItem,
        count: statusCounts[statusItem.id]
      })),
    [statusCounts]
  )

  const labelNavItems = useMemo(
    () =>
      MAIL_LABEL_NAV_ITEMS.map(labelItem => ({
        ...labelItem,
        count: labelCounts[labelItem.id]
      })),
    [labelCounts]
  )

  const activeViewLabel = useMemo(() => {
    if (activeNavType === 'label' && activeLabel) {
      return MAIL_LABEL_NAV_ITEMS.find(labelItem => labelItem.id === activeLabel)?.label ?? 'Mail'
    }

    return statusNavItems.find(statusItem => statusItem.id === activeStatus)?.label ?? 'Mail'
  }, [activeLabel, activeNavType, activeStatus, statusNavItems])

  // Vars
  const mailDisplayProps = {
    email: selectedEmail
  }

  const handleEmailSelectWithMobile = (email: Email) => {
    handleEmailSelect(email)
    setMobileView('detail')
  }

  return (
    <>
      <div className='flex h-[calc(100dvh-12rem)] flex-col lg:h-[calc(100dvh-11rem)] lg:min-h-130'>
        {/* Desktop layout */}
        <div className='hidden h-full lg:flex'>
          <ResizablePanelGroup
            orientation='horizontal'
            className='border-border bg-background h-full items-stretch overflow-hidden rounded-lg border'
          >
            <ResizablePanel defaultSize='15%' minSize='14%' className='bg-card flex flex-col'>
              <div className='p-3'>
                <Button className='w-full'>
                  <MailIcon className='mr-2 size-4' />
                  Compose
                </Button>
              </div>
              <Separator />
              <MailNav
                statusNavItems={statusNavItems}
                labelNavItems={labelNavItems}
                activeStatus={activeStatus}
                activeLabel={activeLabel}
                activeNavType={activeNavType}
                onStatusChange={handleStatusChange}
                onLabelChange={handleLabelChange}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel
              defaultSize='30%'
              minSize='24%'
              className='bg-background flex min-h-0 flex-col overflow-hidden!'
            >
              <Tabs
                value={filterTab}
                onValueChange={value => setFilterTab(value as typeof filterTab)}
                className='flex min-h-0 flex-1 flex-col gap-3'
              >
                <div className='flex items-center gap-3 p-3 pb-0'>
                  <h1 className='text-xl font-bold'>{activeViewLabel}</h1>
                  <TabsList className='bg-muted/60 ml-auto'>
                    <TabsTrigger value='all' className='font-normal'>
                      All mail
                    </TabsTrigger>
                    <TabsTrigger value='unread' className='font-normal'>
                      Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
                    </TabsTrigger>
                  </TabsList>
                </div>
                <Separator />
                <div className='flex items-center gap-2 px-3'>
                  <InputGroup className='relative flex-1'>
                    <InputGroupAddon>
                      <SearchIcon className='size-4' />
                      <span className='sr-only'>Search</span>
                    </InputGroupAddon>
                    <InputGroupInput
                      type='search'
                      placeholder='Search mail'
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className='[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none'
                    />
                  </InputGroup>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant='outline' size='icon' className='shrink-0' />}>
                      <ArrowDownUpIcon className='size-4' />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem>Default order</DropdownMenuItem>
                      <DropdownMenuItem>Newest first</DropdownMenuItem>
                      <DropdownMenuItem>Oldest first</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <TabsContent value='all' className='m-0 flex min-h-0 flex-1 flex-col'>
                  <MailList
                    emails={visibleEmails}
                    selectedEmailId={selectedEmail?.id ?? null}
                    onEmailSelect={handleEmailSelectWithMobile}
                  />
                </TabsContent>
                <TabsContent value='unread' className='m-0 flex min-h-0 flex-1 flex-col'>
                  <MailList
                    emails={visibleEmails}
                    selectedEmailId={selectedEmail?.id ?? null}
                    onEmailSelect={handleEmailSelectWithMobile}
                  />
                </TabsContent>
              </Tabs>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize='55%' minSize='32%' className='bg-background flex min-h-0 flex-col'>
              <MailDisplay {...mailDisplayProps} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Mobile layout */}
        <div className='border-border flex h-full flex-col overflow-hidden rounded-lg border lg:hidden'>
          {mobileView === 'list' && (
            <div className='flex h-full flex-col'>
              <div className='border-border flex items-center gap-2 border-b px-3 py-2'>
                <button
                  type='button'
                  className='hover:bg-muted rounded-md p-1.5'
                  onClick={() => setIsMobileSidebarOpen(true)}
                >
                  <MenuIcon className='size-5' />
                </button>
                <h1 className='flex-1 text-lg font-semibold'>{activeViewLabel}</h1>
                <div className='bg-muted/60 flex gap-1 rounded-md p-1'>
                  <button
                    type='button'
                    onClick={() => setFilterTab('all')}
                    className={cn(
                      'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                      filterTab === 'all' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    All
                  </button>
                  <button
                    type='button'
                    onClick={() => setFilterTab('unread')}
                    className={cn(
                      'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                      filterTab === 'unread' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
                  </button>
                </div>
              </div>
              <div className='flex gap-2 p-3'>
                <InputGroup className='relative flex-1'>
                  <InputGroupAddon>
                    <SearchIcon className='size-4' />
                    <span className='sr-only'>Search</span>
                  </InputGroupAddon>
                  <InputGroupInput
                    type='search'
                    placeholder='Search mail'
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className='[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none'
                  />
                </InputGroup>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant='outline' size='icon' className='shrink-0' />}>
                    <ArrowDownUpIcon className='size-4' />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem>Default order</DropdownMenuItem>
                    <DropdownMenuItem>Newest first</DropdownMenuItem>
                    <DropdownMenuItem>Oldest first</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <MailList
                emails={visibleEmails}
                selectedEmailId={selectedEmail?.id ?? null}
                onEmailSelect={handleEmailSelectWithMobile}
              />
            </div>
          )}

          {mobileView === 'detail' && (
            <div className='relative flex h-full flex-col'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='absolute top-1.5 left-2 p-0 lg:hidden'
                onClick={() => setMobileView('list')}
              >
                <ChevronLeftIcon className='size-4' />
                {activeViewLabel}
              </Button>
              <MailDisplay {...mailDisplayProps} />
            </div>
          )}
        </div>
      </div>

      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side='left' showCloseButton={false}>
          <div className='border-border border-b p-3'>
            <Button className='w-full'>
              <MailIcon />
              Compose
            </Button>
          </div>
          <MailNav
            statusNavItems={statusNavItems}
            labelNavItems={labelNavItems}
            activeStatus={activeStatus}
            activeLabel={activeLabel}
            activeNavType={activeNavType}
            onStatusChange={status => {
              handleStatusChange(status)
              setIsMobileSidebarOpen(false)
              setMobileView('list')
            }}
            onLabelChange={label => {
              handleLabelChange(label)
              setIsMobileSidebarOpen(false)
              setMobileView('list')
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}

export default MailApp
