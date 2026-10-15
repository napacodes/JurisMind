'use client'

// React Imports
import { useState, type ComponentType, type SVGAttributes } from 'react'

// Third-party Imports
import { LinkIcon, PaletteIcon, Trash2Icon } from 'lucide-react'

// Type Imports
import type { AppUser, SocialPlatform } from '@/types/apps/user-types'

// Component Imports
import FacebookIcon from '@/assets/svg/facebook-icon'
import GithubIcon from '@/assets/svg/github-icon'
import LinkedinIcon from '@/assets/svg/linkedin-icon'
import TwitterIcon from '@/assets/svg/twitter-icon'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

// Util Imports
import { cn } from '@/lib/utils'

interface BrandItem {
  image?: string
  icon?: string
}

interface ConnectedIntegration extends BrandItem {
  id: string
  name: string
  description: string
  enabled?: boolean
}

interface SocialAccount extends BrandItem {
  platform: SocialPlatform
  label: string
}

const ICONS: Record<string, ComponentType<SVGAttributes<SVGElement>>> = {
  facebook: FacebookIcon,
  twitter: TwitterIcon,
  linkedin: LinkedinIcon,
  github: GithubIcon,
  dribbble: PaletteIcon,
  mailchimp: PaletteIcon
}

const CONNECTED_INTEGRATIONS: ConnectedIntegration[] = [
  {
    id: 'google',
    name: 'Google',
    description: 'Calendar and contacts',
    image: '/images/brands/google-icon.webp',
    enabled: true
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Communication',
    image: '/images/brands/slack-icon.webp',
    enabled: false
  },
  {
    id: 'github',
    name: 'Github',
    description: 'Manage your Git repository',
    image: '/images/brands/github-white.webp',
    enabled: true
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Email marketing service',
    image: '/images/brands/mailchimp-icon.webp',
    enabled: false
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Communication',
    image: '/images/brands/asana-icon-circle.webp',
    enabled: false
  }
]

const SOCIAL_ACCOUNTS: SocialAccount[] = [
  { platform: 'facebook', label: 'Facebook', icon: 'facebook' },
  { platform: 'twitter', label: 'Twitter', icon: 'twitter' },
  { platform: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
  { platform: 'dribbble', label: 'Dribbble', icon: 'dribbble' }
]

function BrandAvatar({ item, alt }: { item: BrandItem; alt: string }) {
  const Icon = item.icon ? ICONS[item.icon] : null

  return (
    <Avatar className='size-10 rounded-lg after:rounded-lg'>
      {item.image ? <AvatarImage src={item.image} alt={alt} className='rounded-lg object-contain p-1.5' /> : null}
      <AvatarFallback className='rounded-lg'>{Icon ? <Icon className='size-5' /> : null}</AvatarFallback>
    </Avatar>
  )
}

function getSocialHandle(url: string): string {
  const handle = url.replace(/\/$/, '').split('/').pop() ?? url

  return handle.startsWith('@') ? handle : `@${handle}`
}

export interface ConnectionsTabProps {
  user: AppUser
}

export function ConnectionsTab({ user }: ConnectionsTabProps) {
  const [integrationToggles, setIntegrationToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CONNECTED_INTEGRATIONS.map(integration => [integration.id, integration.enabled ?? false]))
  )

  const socialLinks = user.socialLinks ?? []

  return (
    <div className='space-y-6'>
      <Card className='gap-0 py-0'>
        <CardHeader className='border-b px-6 py-4!'>
          <CardTitle className='text-base'>Connected Accounts</CardTitle>
          <p className='text-muted-foreground text-sm'>Display content from your connected accounts on your site</p>
        </CardHeader>
        <CardContent className='px-0 pb-0'>
          <div className='divide-y'>
            {CONNECTED_INTEGRATIONS.map(integration => (
              <div key={integration.id} className='flex flex-wrap items-center justify-between gap-4 px-6 py-4'>
                <div className='flex min-w-0 flex-1 items-center gap-4'>
                  <BrandAvatar item={integration} alt={integration.name} />
                  <div className='min-w-0'>
                    <p className='font-medium'>{integration.name}</p>
                    <p className='text-muted-foreground text-sm'>{integration.description}</p>
                  </div>
                </div>
                <Switch
                  checked={integrationToggles[integration.id] ?? false}
                  onCheckedChange={value => setIntegrationToggles(prev => ({ ...prev, [integration.id]: value }))}
                  aria-label={`Toggle ${integration.name}`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className='gap-0 py-0'>
        <CardHeader className='border-b px-6 py-4!'>
          <CardTitle className='text-base'>Social Accounts</CardTitle>
          <p className='text-muted-foreground text-sm'>Display content from social accounts on your site</p>
        </CardHeader>
        <CardContent className='px-0 pb-0'>
          <div className='divide-y'>
            {SOCIAL_ACCOUNTS.map(account => {
              const linkedAccount = socialLinks.find(link => link.platform === account.platform)
              const isConnected = Boolean(linkedAccount)

              return (
                <div key={account.platform} className='flex flex-wrap items-center justify-between gap-4 px-6 py-4'>
                  <div className='flex min-w-0 flex-1 items-center gap-4'>
                    <BrandAvatar item={account} alt={account.label} />
                    <div className='min-w-0'>
                      <p className='font-medium'>{account.label}</p>
                      {isConnected && linkedAccount ? (
                        <a
                          href={linkedAccount.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-primary text-sm hover:underline'
                        >
                          {getSocialHandle(linkedAccount.url)}
                        </a>
                      ) : (
                        <p className='text-muted-foreground text-sm'>Not Connected</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    className={cn(
                      'size-9 shrink-0 rounded-lg',
                      isConnected
                        ? 'bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                    aria-label={isConnected ? `Disconnect ${account.label}` : `Connect ${account.label}`}
                  >
                    {isConnected ? <Trash2Icon className='size-4.5' /> : <LinkIcon className='size-4.5' />}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
