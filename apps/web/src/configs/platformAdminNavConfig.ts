import type { LucideIcon } from 'lucide-react'
import {
  BookOpenText,
  FileText,
  Gauge,
  PanelsTopLeft,
  SearchCheck,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'

export type PlatformAdminNavItem =
  | { kind: 'link'; label: string; href: string }
  | { kind: 'unavailable'; label: string; note?: string }

export type PlatformAdminNavSection = {
  id: string
  label: string
  icon: LucideIcon
  collapsible?: boolean
  items: PlatformAdminNavItem[]
}

export const platformAdminNavSections: PlatformAdminNavSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Gauge,
    collapsible: false,
    items: [{ kind: 'link', label: 'Overview', href: '/administration' }],
  },
  {
    id: 'users',
    label: 'User Accounts',
    icon: UsersRound,
    items: [
      { kind: 'link', label: 'All users', href: '/administration/users' },
      { kind: 'unavailable', label: 'KYC pending users' },
      { kind: 'unavailable', label: 'Unverified users' },
      { kind: 'unavailable', label: 'Suspended users' },
      { kind: 'unavailable', label: 'Active users' },
    ],
  },
  {
    id: 'verification',
    label: 'KYC Verification',
    icon: ShieldCheck,
    items: [
      { kind: 'link', label: 'Firm verification', href: '/administration/firm-verifications' },
      { kind: 'link', label: 'Pending reviews', href: '/administration/lawyer-verifications' },
      { kind: 'unavailable', label: 'Verification records' },
      { kind: 'unavailable', label: 'KYC templates' },
      { kind: 'unavailable', label: 'Verification providers' },
    ],
  },
  {
    id: 'cms',
    label: 'CMS Management',
    icon: FileText,
    items: [
      { kind: 'link', label: 'Website content', href: '/administration/content' },
      { kind: 'unavailable', label: 'Page components' },
      { kind: 'unavailable', label: 'Site navigation' },
      { kind: 'unavailable', label: 'Footer sections' },
      { kind: 'unavailable', label: 'Style manager' },
    ],
  },
  {
    id: 'site-builder',
    label: 'Site Builder',
    icon: PanelsTopLeft,
    collapsible: false,
    items: [{ kind: 'unavailable', label: 'Site Builder' }],
  },
  {
    id: 'seo-social',
    label: 'SEO & Social',
    icon: SearchCheck,
    items: [
      { kind: 'unavailable', label: 'SEO settings' },
      { kind: 'unavailable', label: 'Social links' },
    ],
  },
  {
    id: 'blog',
    label: 'Blog',
    icon: BookOpenText,
    items: [
      { kind: 'unavailable', label: 'Blog posts' },
      { kind: 'unavailable', label: 'Blog categories' },
    ],
  },
]

export function platformAdminPageTitle(pathname: string): string {
  for (const section of platformAdminNavSections) {
    const item = section.items.find((entry) => entry.kind === 'link' && entry.href === pathname)
    if (item?.kind === 'link') return item.label
  }
  return pathname === '/administration' ? 'Overview' : 'Platform administration'
}
