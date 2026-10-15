export type UserRole = 'Admin' | 'Editor' | 'Subscriber' | 'Maintainer' | 'Guest'
export type UserPlan = 'Basic' | 'Team' | 'Enterprise'
export type UserStatus = 'Active' | 'Pending' | 'Suspended' | 'Inactive'
export type UserBilling = 'Auto Debit' | 'Manual' | 'Credit Card'

export interface UserProject {
  id: string
  name: string
  type: string
  logo?: string
  leader: string
  team: { avatar?: string; initials: string }[]
  teamExtraCount?: number
  progress: number
  updatedAt?: string
}

export type ActivityFileType = 'pdf' | 'image' | 'doc' | 'excel'

export interface ActivityPerson {
  name: string
  role?: string
  avatar?: string
  initials: string
}

export interface UserActivityItem {
  id: string
  description: string
  detail?: string
  timestamp: string
  attachment?: {
    name: string
    fileType: ActivityFileType
  }
  person?: ActivityPerson
  teamMembers?: ActivityPerson[]
  teamExtraCount?: number
}

export interface UserBillingPlan {
  name: string
  price: number
  period: 'month' | 'year'
  isPopular?: boolean
  features: string[]
  daysUsed: number
  totalDays: number
}

export type InvoiceStatus = 'paid' | 'pending' | 'cancelled' | 'draft'

export interface UserInvoice {
  id: string
  number: string
  status: InvoiceStatus
  total: number
  issuedDate: string
}

export interface UserConnection {
  id: string
  name: string
  username: string
  avatar?: string
  initials: string
  isConnected: boolean
  connectionCount?: number
}

export interface UserTeamMembership {
  name: string
  memberCount: number
  role?: string
  logo?: string
}

export type SocialPlatform =
  | 'twitter'
  | 'linkedin'
  | 'github'
  | 'instagram'
  | 'dribbble'
  | 'behance'
  | 'skype'
  | 'website'
  | 'facebook'

export interface UserSocialLink {
  platform: SocialPlatform
  url: string
}

export interface UserRecentDevice {
  id: string
  browser: string
  device: string
  location: string
  lastActive: string
  isCurrentDevice?: boolean
}

export interface UserNotificationSetting {
  id: string
  title: string
  description: string
  email: boolean
  browser: boolean
  app: boolean
}

export interface AppUser {
  id: string
  name: string
  email: string
  avatar?: string // URL string — if absent, show initials
  role: UserRole
  plan: UserPlan
  status: UserStatus
  billing: UserBilling
  company?: string
  country?: string
  contact?: string
  joinedDate: string // ISO 8601
  coverImage?: string
  website?: string
  skype?: string
  socialLinks?: UserSocialLink[]
  tasksDone?: number
  projectsDone?: number
  username?: string
  billingEmail?: string
  taxId?: string
  language?: string
  projects?: UserProject[]
  activityLog?: UserActivityItem[]
  billingPlan?: UserBillingPlan
  invoices?: UserInvoice[]
  connections?: UserConnection[]
  teamMemberships?: UserTeamMembership[]
  recentDevices?: UserRecentDevice[]
  twoFactorEnabled?: boolean
  notificationSettings?: UserNotificationSetting[]
}

export interface UserFilters {
  role: UserRole | 'all'
  plan: UserPlan | 'all'
  status: UserStatus | 'all'
  search: string
}

export type UserFormData = Pick<
  AppUser,
  'name' | 'email' | 'contact' | 'company' | 'country' | 'role' | 'plan' | 'status'
>

// For add/edit sheet
export type UserSheetMode = 'add' | 'edit'

// For column visibility
export type UserColumnId = 'select' | 'user' | 'role' | 'plan' | 'billing' | 'status' | 'joinedDate' | 'actions'

export type UserSortColumn = Exclude<UserColumnId, 'select' | 'actions'>

export type UserSorting = {
  id: UserSortColumn
  desc: boolean
}
