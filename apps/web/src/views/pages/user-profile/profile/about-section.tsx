// Third-party Imports
import {
  CheckCheckIcon,
  CheckIcon,
  FlagIcon,
  LanguagesIcon,
  LayoutGridIcon,
  type LucideIcon,
  MailIcon,
  MessagesSquareIcon,
  PhoneIcon,
  StarIcon,
  UserIcon
} from 'lucide-react'

// Components Imports
import { Card, CardContent } from '@/components/ui/card'

// Data Imports
import { db } from '@/fake-db/pages/user-profile'

// Type Imports
import type { UserProfileInfoIconKey, UserProfileOverviewIconKey } from '@/types/pages/user-profile-types'

type AboutItem = {
  label: string
  value: string
  icon?: LucideIcon
}

const profileIconMap: Record<UserProfileInfoIconKey, LucideIcon> = {
  UserIcon,
  CheckCheckIcon,
  StarIcon,
  FlagIcon,
  LanguagesIcon,
  PhoneIcon,
  MessagesSquareIcon,
  MailIcon
}

const overviewIconMap: Record<UserProfileOverviewIconKey, LucideIcon> = {
  CheckIcon,
  UserIcon,
  LayoutGridIcon
}

const profileSections = db.profileSections.map(section => ({
  title: section.title,
  items: section.items.map<AboutItem>(item => ({
    label: item.label,
    value: item.value,
    icon:
      item.iconKey && item.iconKey in profileIconMap
        ? profileIconMap[item.iconKey as UserProfileInfoIconKey]
        : undefined
  }))
}))

const overviewSections = db.overviewSections.map(section => ({
  title: section.title,
  items: section.items.map<AboutItem>(item => ({
    label: item.label,
    value: item.value,
    icon:
      item.iconKey && item.iconKey in overviewIconMap
        ? overviewIconMap[item.iconKey as UserProfileOverviewIconKey]
        : undefined
  }))
}))

function AboutSection() {
  return (
    <div className='space-y-6'>
      <Card>
        <CardContent className='space-y-5'>
          {profileSections.map(section => (
            <div className='space-y-2' key={section.title}>
              <p className='text-muted-foreground text-xs font-medium uppercase'>{section.title}</p>
              <ul className='space-y-3'>
                {section.items.map(item => {
                  const Icon = item.icon

                  return (
                    <li className='flex items-center gap-2' key={item.label}>
                      {Icon ? <Icon className='size-4' /> : null}
                      <span className='text-sm font-medium'>{item.label}:</span>
                      <span className='text-sm'>{item.value}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className='space-y-5'>
          {overviewSections.map(section => (
            <div className='space-y-2' key={section.title}>
              <p className='text-muted-foreground text-xs font-medium uppercase'>{section.title}</p>
              <ul className='space-y-3'>
                {section.items.map(item => {
                  const Icon = item.icon

                  return (
                    <li className='flex items-center gap-2' key={item.label}>
                      {Icon ? <Icon className='size-4' /> : null}
                      <span className='text-sm font-medium'>{item.label}:</span>
                      <span className='text-sm'>{item.value}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default AboutSection
