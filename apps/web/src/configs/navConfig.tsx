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
      { icon: 'LayoutDashboard', label: 'Overview', href: '/dashboard' },
      { icon: 'BriefcaseBusiness', label: 'Matters & Cases', href: '/matters' },
      { icon: 'UsersRound', label: 'Clients', href: '/clients' },
      { icon: 'CalendarDays', label: 'Calendar & Hearings', href: '/apps/calendar' },
      { icon: 'ListTodo', label: 'Tasks & Deadlines', href: '/tasks' },
      { icon: 'Files', label: 'Documents', href: '/documents' },
      { icon: 'MessagesSquare', label: 'Communications', href: '/communications' }
    ]
  },
  {
    groupLabel: 'Firm Management',
    items: [
      { icon: 'UserRoundCog', label: 'Lawyers & Staff', href: '/staff' },
      { icon: 'Timer', label: 'Time Tracking', href: '/time' },
      { icon: 'ReceiptText', label: 'Billing & Invoices', href: '/billing' },
      { icon: 'ChartNoAxesCombined', label: 'Reports', href: '/reports' }
    ]
  },
  {
    groupLabel: 'Administration',
    items: [
      { icon: 'ShieldCheck', label: 'Users & Roles', href: '/administration/users' },
      { icon: 'Settings2', label: 'Firm Settings', href: '/pages/user-settings?setting=workspace' },
      { icon: 'ScrollText', label: 'Audit Logs', href: '/audit-logs' }
    ]
  }
]
