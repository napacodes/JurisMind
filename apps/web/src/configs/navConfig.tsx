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
  permission?: string
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
      { icon: 'LayoutDashboard', label: 'Overview', href: '/dashboard', permission: 'workspace:read:metadata' },
      { icon: 'UsersRound', label: 'Firm team', href: '/staff', permission: 'workspace:read:memberships' },
      { icon: 'ShieldCheck', label: 'Firm verification', href: '/firm-verification', permission: 'firm-kyc:submit:self' },
      { icon: 'ShieldCheck', label: 'Credential status', href: '/lawyer-verification', permission: 'lawyer-credential:submit:self' }
    ]
  }
]

export function navItemsForPermissions(items: NavItem[], permissions: readonly string[]): NavItem[] {
  return items.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || permissions.includes(item.permission)),
  })).filter((group) => group.items.length > 0)
}
