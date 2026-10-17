import type * as Icon from 'lucide-react'

type IconName = keyof typeof Icon

export type MenuLeafSubItem = {
  label: string
  href: string
  activePath?: string
  badge?: string
  badgeClassName?: string
  target?: '_blank' | '_self' | '_parent' | '_top'
}

export type MenuGroupSubItem = {
  label: string
  childItems: MenuLeafSubItem[]
}

export type MenuSubItem = MenuLeafSubItem | MenuGroupSubItem

export type MenuItem = {
  icon: IconName
  label: string
} & (
  | { href: string; badge?: string; badgeClassName?: string; childItems?: never; target?: '_blank' | '_self' | '_parent' | '_top' }
  | { href?: never; badge?: string; badgeClassName?: string; childItems: MenuSubItem[] }
)

export type NavItem = {
  groupLabel?: string
  items: MenuItem[]
}

export const navItems: NavItem[] = [
  {
    groupLabel: 'Workspace',
    items: [
      { icon: 'LayoutDashboard', label: 'Overview', href: '/dashboard' }
    ]
  }
]
