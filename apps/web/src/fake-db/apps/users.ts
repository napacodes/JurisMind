// Type Imports
import type { AppUser } from '@/types/apps/user-types'

type UserViewProfileData = Pick<AppUser, 'twoFactorEnabled' | 'recentDevices' | 'notificationSettings'>

function createUserViewProfile(userIndex: number, country: string): UserViewProfileData {
  const browsers = ['Chrome on Windows', 'Safari on macOS', 'Firefox on Linux', 'Edge on Windows', 'Chrome on Android']
  const devices = ['Dell XPS 15', 'MacBook Pro 14"', 'ThinkPad X1 Carbon', 'Google Pixel 8', 'iPhone 15 Pro']
  const offset = userIndex - 1

  return {
    twoFactorEnabled: userIndex % 3 === 0,
    recentDevices: [
      {
        id: `device-${String(userIndex).padStart(3, '0')}-1`,
        browser: browsers[offset % browsers.length],
        device: devices[offset % devices.length],
        location: country,
        lastActive: 'Active now',
        isCurrentDevice: true
      },
      {
        id: `device-${String(userIndex).padStart(3, '0')}-2`,
        browser: browsers[(offset + 1) % browsers.length],
        device: devices[(offset + 2) % devices.length],
        location: country,
        lastActive: `${1 + (offset % 3)} days ago`
      },
      {
        id: `device-${String(userIndex).padStart(3, '0')}-3`,
        browser: browsers[(offset + 2) % browsers.length],
        device: devices[(offset + 3) % devices.length],
        location: country,
        lastActive: `${4 + (offset % 3)} days ago`
      }
    ],
    notificationSettings: [
      {
        id: 'new-for-you',
        title: 'New for you',
        description: 'Email when someone follows you or mentions you.',
        email: true,
        browser: offset % 2 === 0,
        app: userIndex % 2 === 0
      },
      {
        id: 'account-activity',
        title: 'Account activity',
        description: 'Email when your account has new activity or security alerts.',
        email: true,
        browser: true,
        app: offset % 3 !== 0
      },
      {
        id: 'browser-login',
        title: 'A new browser used to sign in',
        description: 'Email when a new browser is used to sign in.',
        email: userIndex % 4 !== 0,
        browser: true,
        app: true
      },
      {
        id: 'new-device',
        title: 'A new device is linked',
        description: 'Email when a new device is linked to your account.',
        email: true,
        browser: offset % 3 === 0,
        app: false
      }
    ]
  }
}

export const users: AppUser[] = [
  {
    id: 'user-001',
    name: 'Zsasza McCleverty',
    email: 'zmcclevertye@soundcloud.com',
    role: 'Maintainer',
    plan: 'Enterprise',
    status: 'Pending',
    billing: 'Auto Debit',
    company: 'Skinder PVT LTD',
    country: 'United States',
    contact: '+1 (555) 200-1000',
    joinedDate: '2022-01-14T00:00:00.000Z',
    avatar: '/images/avatars/avatar-1.webp',
    socialLinks: [
      {
        platform: 'twitter',
        url: 'https://twitter.com/zsasza'
      },
      {
        platform: 'linkedin',
        url: 'https://linkedin.com/in/zsasza-mccleverty'
      },
      {
        platform: 'github',
        url: 'https://github.com/zsasza'
      }
    ],
    tasksDone: 800,
    projectsDone: 200,
    username: 'zsaszamccleverty',
    billingEmail: 'zsaszamccleverty.billing@billing.io',
    taxId: 'Tax-8800',
    language: 'English',
    projects: [
      {
        id: 'proj-001',
        name: 'BGC eCommerce App',
        type: 'React Project',
        logo: '/images/brands/figma-icon.webp',
        leader: 'Eileen',
        team: [
          {
            avatar: '/images/avatars/avatar-1.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-2.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 45,
        updatedAt: 'Updated 1 days ago'
      },
      {
        id: 'proj-002',
        name: 'Falcon Logo Design',
        type: 'Figma Project',
        logo: '/images/brands/notion-white.webp',
        leader: 'James',
        team: [
          {
            avatar: '/images/avatars/avatar-3.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-4.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 3,
        progress: 52,
        updatedAt: 'Updated 2 days ago'
      },
      {
        id: 'proj-003',
        name: 'Dashboard Design',
        type: 'Vue Project',
        logo: '/images/brands/asana-icon-circle.webp',
        leader: 'Sarah',
        team: [
          {
            avatar: '/images/avatars/avatar-5.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-6.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 4,
        progress: 59,
        updatedAt: 'Updated 3 days ago'
      },
      {
        id: 'proj-004',
        name: 'Foodista Mobile App',
        type: 'Angular Project',
        logo: '/images/brands/dropbox-icon-circle.webp',
        leader: 'Marcus',
        team: [
          {
            avatar: '/images/avatars/avatar-7.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-8.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 66,
        updatedAt: 'Updated 4 days ago'
      }
    ],
    activityLog: [
      {
        id: 'act-001',
        description: '12 Invoices have been paid',
        detail: 'Invoices have been paid to the company',
        timestamp: '12 min ago',
        attachment: {
          name: 'invoice.pdf',
          fileType: 'pdf'
        }
      },
      {
        id: 'act-002',
        description: 'Client Meeting',
        detail: 'Project meeting with john @10:15am',
        timestamp: '45 min ago',
        person: {
          name: 'Lester McCarthy (Client)',
          role: 'CEO of Pixinvent',
          avatar: '/images/avatars/avatar-9.webp',
          initials: 'LM'
        }
      },
      {
        id: 'act-003',
        description: 'Create a new project for client',
        detail: '6 team members in a project',
        timestamp: '2 Day Ago',
        teamMembers: [
          {
            name: 'John Doe',
            initials: 'JD',
            avatar: '/images/avatars/avatar-10.webp'
          },
          {
            name: 'Anna Richard',
            initials: 'AR',
            avatar: '/images/avatars/avatar-11.webp'
          },
          {
            name: 'Bob Carter',
            initials: 'BC',
            avatar: '/images/avatars/avatar-12.webp'
          }
        ],
        teamExtraCount: 3
      },
      {
        id: 'act-004',
        description: 'Order of the New Hand Bag',
        timestamp: '5 Day Ago'
      }
    ],
    billingPlan: {
      name: 'Enterprise',
      price: 499,
      period: 'month',
      isPopular: false,
      features: ['Unlimited Users', '1TB storage', '24/7 Support', 'Advanced Analytics', 'SLA'],
      daysUsed: 8,
      totalDays: 30
    },
    invoices: [
      {
        id: 'inv-001',
        number: '#5030',
        status: 'paid',
        total: 500,
        issuedDate: '2026-01-15T00:00:00.000Z'
      },
      {
        id: 'inv-002',
        number: '#5031',
        status: 'paid',
        total: 921,
        issuedDate: '2026-02-10T00:00:00.000Z'
      },
      {
        id: 'inv-003',
        number: '#5032',
        status: 'paid',
        total: 1342,
        issuedDate: '2026-03-05T00:00:00.000Z'
      },
      {
        id: 'inv-004',
        number: '#5033',
        status: 'paid',
        total: 1763,
        issuedDate: '2026-03-28T00:00:00.000Z'
      },
      {
        id: 'inv-005',
        number: '#5034',
        status: 'paid',
        total: 2184,
        issuedDate: '2026-04-12T00:00:00.000Z'
      },
      {
        id: 'inv-006',
        number: '#5035',
        status: 'paid',
        total: 2605,
        issuedDate: '2026-05-01T00:00:00.000Z'
      }
    ],
    ...createUserViewProfile(1, 'United States')
  },
  {
    id: 'user-002',
    name: 'Galen Slixby',
    email: 'galen.slixby1@example.com',
    role: 'Admin',
    plan: 'Basic',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'Binford Ltd',
    country: 'United Kingdom',
    contact: '+1 (555) 201-1013',
    joinedDate: '2022-03-22T00:00:00.000Z',
    avatar: '/images/avatars/avatar-2.webp',
    socialLinks: [
      {
        platform: 'linkedin',
        url: 'https://linkedin.com/in/galen-slixby'
      },
      {
        platform: 'github',
        url: 'https://github.com/gslixby'
      }
    ],
    tasksDone: 973,
    projectsDone: 271,
    username: 'galenslixby',
    billingEmail: 'galenslixby.billing@accounts.co',
    taxId: 'Tax-8817',
    language: 'English',
    projects: [
      {
        id: 'proj-011',
        name: 'Dojo Email App',
        type: 'Figma Project',
        logo: '/images/brands/slack-icon.webp',
        leader: 'James',
        team: [
          {
            avatar: '/images/avatars/avatar-17.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-18.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 56,
        updatedAt: 'Updated 2 days ago'
      },
      {
        id: 'proj-012',
        name: 'Tailwind CSS Kit',
        type: 'Vue Project',
        logo: '/images/brands/google-icon.webp',
        leader: 'Sarah',
        team: [
          {
            avatar: '/images/avatars/avatar-19.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-20.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 3,
        progress: 63,
        updatedAt: 'Updated 3 days ago'
      },
      {
        id: 'proj-013',
        name: 'Admin Template Pro',
        type: 'Angular Project',
        logo: '/images/brands/figma-icon.webp',
        leader: 'Marcus',
        team: [
          {
            avatar: '/images/avatars/avatar-1.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-2.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 4,
        progress: 70,
        updatedAt: 'Updated 4 days ago'
      },
      {
        id: 'proj-014',
        name: 'Mobile Banking App',
        type: 'Node Project',
        logo: '/images/brands/notion-white.webp',
        leader: 'Priya',
        team: [
          {
            avatar: '/images/avatars/avatar-3.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-4.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 77,
        updatedAt: 'Updated 5 days ago'
      },
      {
        id: 'proj-015',
        name: 'Figma UI Kit',
        type: 'React Project',
        logo: '/images/brands/asana-icon-circle.webp',
        leader: 'Tom',
        team: [
          {
            avatar: '/images/avatars/avatar-5.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-6.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 3,
        progress: 84,
        updatedAt: 'Updated 6 days ago'
      }
    ],
    activityLog: [
      {
        id: 'act-005',
        description: '11 Invoices have been paid',
        detail: 'Invoices have been paid to the company',
        timestamp: '12 min ago',
        attachment: {
          name: 'invoice.pdf',
          fileType: 'pdf'
        }
      },
      {
        id: 'act-006',
        description: 'Client Meeting',
        detail: 'Project meeting with sarah @10:15am',
        timestamp: '45 min ago',
        person: {
          name: 'Lester McCarthy (Client)',
          role: 'CEO of Pixinvent',
          avatar: '/images/avatars/avatar-7.webp',
          initials: 'LM'
        }
      },
      {
        id: 'act-007',
        description: 'Create a new project for client',
        detail: '6 team members in a project',
        timestamp: '2 Day Ago',
        teamMembers: [
          {
            name: 'John Doe',
            initials: 'JD',
            avatar: '/images/avatars/avatar-8.webp'
          },
          {
            name: 'Anna Richard',
            initials: 'AR',
            avatar: '/images/avatars/avatar-9.webp'
          },
          {
            name: 'Bob Carter',
            initials: 'BC',
            avatar: '/images/avatars/avatar-10.webp'
          }
        ],
        teamExtraCount: 3
      },
      {
        id: 'act-008',
        description: 'Weekly report submitted',
        detail: 'Q2 performance summary sent to stakeholders',
        timestamp: '3 Day Ago'
      }
    ],
    billingPlan: {
      name: 'Basic',
      price: 99,
      period: 'month',
      isPopular: true,
      features: ['10 Users', 'Up to 10GB storage', 'Basic Support'],
      daysUsed: 26,
      totalDays: 30
    },
    invoices: [
      {
        id: 'inv-011',
        number: '#5037',
        status: 'paid',
        total: 817,
        issuedDate: '2026-01-15T00:00:00.000Z'
      },
      {
        id: 'inv-012',
        number: '#5038',
        status: 'paid',
        total: 1238,
        issuedDate: '2026-02-10T00:00:00.000Z'
      },
      {
        id: 'inv-013',
        number: '#5039',
        status: 'paid',
        total: 1659,
        issuedDate: '2026-03-05T00:00:00.000Z'
      },
      {
        id: 'inv-014',
        number: '#5040',
        status: 'paid',
        total: 2080,
        issuedDate: '2026-03-28T00:00:00.000Z'
      },
      {
        id: 'inv-015',
        number: '#5041',
        status: 'paid',
        total: 2501,
        issuedDate: '2026-04-12T00:00:00.000Z'
      },
      {
        id: 'inv-016',
        number: '#5042',
        status: 'pending',
        total: 2922,
        issuedDate: '2026-05-01T00:00:00.000Z'
      },
      {
        id: 'inv-017',
        number: '#5043',
        status: 'pending',
        total: 3343,
        issuedDate: '2026-05-20T00:00:00.000Z'
      }
    ],
    ...createUserViewProfile(2, 'United Kingdom')
  },
  {
    id: 'user-003',
    name: 'Halsey Redmore',
    email: 'halsey.redmore2@example.com',
    role: 'Admin',
    plan: 'Basic',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'Barrows Inc',
    country: 'Canada',
    contact: '+1 (555) 202-1026',
    joinedDate: '2022-05-08T00:00:00.000Z',
    avatar: '/images/avatars/avatar-3.webp',
    socialLinks: [
      {
        platform: 'twitter',
        url: 'https://twitter.com/hredmore'
      },
      {
        platform: 'dribbble',
        url: 'https://dribbble.com/hredmore'
      }
    ],
    tasksDone: 1146,
    projectsDone: 342,
    username: 'halseyredmore',
    billingEmail: 'halseyredmore.billing@invoice.net',
    taxId: 'Tax-8834',
    language: 'English',
    projects: [
      {
        id: 'proj-021',
        name: 'BGC eCommerce App',
        type: 'Vue Project',
        logo: '/images/brands/dropbox-icon-circle.webp',
        leader: 'Sarah',
        team: [
          {
            avatar: '/images/avatars/avatar-15.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-16.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 67,
        updatedAt: 'Updated 3 days ago'
      },
      {
        id: 'proj-022',
        name: 'Dashboard Design',
        type: 'Angular Project',
        logo: '/images/brands/slack-icon.webp',
        leader: 'Marcus',
        team: [
          {
            avatar: '/images/avatars/avatar-17.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-18.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 3,
        progress: 74,
        updatedAt: 'Updated 4 days ago'
      },
      {
        id: 'proj-023',
        name: 'Foodista Mobile App',
        type: 'Node Project',
        logo: '/images/brands/google-icon.webp',
        leader: 'Priya',
        team: [
          {
            avatar: '/images/avatars/avatar-19.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-20.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 4,
        progress: 81,
        updatedAt: 'Updated 5 days ago'
      },
      {
        id: 'proj-024',
        name: 'Dojo Email App',
        type: 'React Project',
        logo: '/images/brands/figma-icon.webp',
        leader: 'Tom',
        team: [
          {
            avatar: '/images/avatars/avatar-1.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-2.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 88,
        updatedAt: 'Updated 6 days ago'
      },
      {
        id: 'proj-025',
        name: 'Tailwind CSS Kit',
        type: 'Figma Project',
        logo: '/images/brands/notion-white.webp',
        leader: 'Lisa',
        team: [
          {
            avatar: '/images/avatars/avatar-3.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-4.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 3,
        progress: 45,
        updatedAt: 'Updated 7 days ago'
      },
      {
        id: 'proj-026',
        name: 'BGC eCommerce App',
        type: 'Vue Project',
        logo: '/images/brands/asana-icon-circle.webp',
        leader: 'David',
        team: [
          {
            avatar: '/images/avatars/avatar-5.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-6.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 4,
        progress: 52,
        updatedAt: 'Updated 1 days ago'
      }
    ],
    activityLog: [
      {
        id: 'act-009',
        description: '12 Invoices have been paid',
        detail: 'Invoices have been paid to the company',
        timestamp: '12 min ago',
        attachment: {
          name: 'invoice.pdf',
          fileType: 'pdf'
        }
      },
      {
        id: 'act-010',
        description: 'Client Meeting',
        detail: 'Project meeting with alex @10:15am',
        timestamp: '45 min ago',
        person: {
          name: 'Lester McCarthy (Client)',
          role: 'CEO of Pixinvent',
          avatar: '/images/avatars/avatar-7.webp',
          initials: 'LM'
        }
      },
      {
        id: 'act-011',
        description: 'Create a new project for client',
        detail: '6 team members in a project',
        timestamp: '2 Day Ago',
        teamMembers: [
          {
            name: 'John Doe',
            initials: 'JD',
            avatar: '/images/avatars/avatar-8.webp'
          },
          {
            name: 'Anna Richard',
            initials: 'AR',
            avatar: '/images/avatars/avatar-9.webp'
          },
          {
            name: 'Bob Carter',
            initials: 'BC',
            avatar: '/images/avatars/avatar-10.webp'
          }
        ],
        teamExtraCount: 3
      },
      {
        id: 'act-012',
        description: 'Order of the New Hand Bag',
        timestamp: '5 Day Ago'
      }
    ],
    billingPlan: {
      name: 'Basic',
      price: 99,
      period: 'month',
      isPopular: true,
      features: ['10 Users', 'Up to 10GB storage', 'Basic Support'],
      daysUsed: 26,
      totalDays: 30
    },
    invoices: [
      {
        id: 'inv-021',
        number: '#5044',
        status: 'paid',
        total: 1134,
        issuedDate: '2026-01-15T00:00:00.000Z'
      },
      {
        id: 'inv-022',
        number: '#5045',
        status: 'paid',
        total: 1555,
        issuedDate: '2026-02-10T00:00:00.000Z'
      },
      {
        id: 'inv-023',
        number: '#5046',
        status: 'paid',
        total: 1976,
        issuedDate: '2026-03-05T00:00:00.000Z'
      },
      {
        id: 'inv-024',
        number: '#5047',
        status: 'paid',
        total: 2397,
        issuedDate: '2026-03-28T00:00:00.000Z'
      },
      {
        id: 'inv-025',
        number: '#5048',
        status: 'pending',
        total: 2818,
        issuedDate: '2026-04-12T00:00:00.000Z'
      },
      {
        id: 'inv-026',
        number: '#5049',
        status: 'pending',
        total: 3239,
        issuedDate: '2026-05-01T00:00:00.000Z'
      },
      {
        id: 'inv-027',
        number: '#5050',
        status: 'cancelled',
        total: 3660,
        issuedDate: '2026-05-20T00:00:00.000Z'
      },
      {
        id: 'inv-028',
        number: '#5051',
        status: 'draft',
        total: 4081,
        issuedDate: '2026-06-19T00:00:00.000Z'
      }
    ],
    ...createUserViewProfile(3, 'Canada')
  },
  {
    id: 'user-004',
    name: 'Marjory Sicely',
    email: 'marjory.sicely3@example.com',
    role: 'Admin',
    plan: 'Basic',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'Acme Corp',
    country: 'Australia',
    contact: '+1 (555) 203-1039',
    joinedDate: '2022-07-19T00:00:00.000Z',
    avatar: '/images/avatars/avatar-4.webp',
    socialLinks: [
      {
        platform: 'linkedin',
        url: 'https://linkedin.com/in/marjory-sicely'
      },
      {
        platform: 'github',
        url: 'https://github.com/msicely'
      },
      {
        platform: 'twitter',
        url: 'https://twitter.com/msicely'
      }
    ],
    tasksDone: 1319,
    projectsDone: 413,
    username: 'marjorysicely',
    billingEmail: 'marjorysicely.billing@paymail.com',
    taxId: 'Tax-8851',
    language: 'English',
    projects: [
      {
        id: 'proj-031',
        name: 'Falcon Logo Design',
        type: 'Angular Project',
        logo: '/images/brands/dropbox-icon-circle.webp',
        leader: 'Marcus',
        team: [
          {
            avatar: '/images/avatars/avatar-15.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-16.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 78,
        updatedAt: 'Updated 4 days ago'
      },
      {
        id: 'proj-032',
        name: 'Admin Template Pro',
        type: 'Node Project',
        logo: '/images/brands/slack-icon.webp',
        leader: 'Priya',
        team: [
          {
            avatar: '/images/avatars/avatar-17.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-18.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 3,
        progress: 85,
        updatedAt: 'Updated 5 days ago'
      },
      {
        id: 'proj-033',
        name: 'Mobile Banking App',
        type: 'React Project',
        logo: '/images/brands/google-icon.webp',
        leader: 'Tom',
        team: [
          {
            avatar: '/images/avatars/avatar-19.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-20.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 4,
        progress: 92,
        updatedAt: 'Updated 6 days ago'
      },
      {
        id: 'proj-034',
        name: 'BGC eCommerce App',
        type: 'Figma Project',
        logo: '/images/brands/figma-icon.webp',
        leader: 'Lisa',
        team: [
          {
            avatar: '/images/avatars/avatar-1.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-2.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 49,
        updatedAt: 'Updated 7 days ago'
      },
      {
        id: 'proj-035',
        name: 'Falcon Logo Design',
        type: 'Vue Project',
        logo: '/images/brands/notion-white.webp',
        leader: 'David',
        team: [
          {
            avatar: '/images/avatars/avatar-3.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-4.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 3,
        progress: 56,
        updatedAt: 'Updated 1 days ago'
      },
      {
        id: 'proj-036',
        name: 'Admin Template Pro',
        type: 'Angular Project',
        logo: '/images/brands/asana-icon-circle.webp',
        leader: 'Nina',
        team: [
          {
            avatar: '/images/avatars/avatar-5.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-6.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 4,
        progress: 63,
        updatedAt: 'Updated 2 days ago'
      },
      {
        id: 'proj-037',
        name: 'Mobile Banking App',
        type: 'Node Project',
        logo: '/images/brands/dropbox-icon-circle.webp',
        leader: 'Alex',
        team: [
          {
            avatar: '/images/avatars/avatar-7.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-8.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 70,
        updatedAt: 'Updated 3 days ago'
      }
    ],
    activityLog: [
      {
        id: 'act-013',
        description: '13 Invoices have been paid',
        detail: 'Invoices have been paid to the company',
        timestamp: '12 min ago',
        attachment: {
          name: 'invoice.pdf',
          fileType: 'pdf'
        }
      },
      {
        id: 'act-014',
        description: 'Client Meeting',
        detail: 'Project meeting with maria @10:15am',
        timestamp: '45 min ago',
        person: {
          name: 'Lester McCarthy (Client)',
          role: 'CEO of Pixinvent',
          avatar: '/images/avatars/avatar-9.webp',
          initials: 'LM'
        }
      },
      {
        id: 'act-015',
        description: 'Create a new project for client',
        detail: '6 team members in a project',
        timestamp: '2 Day Ago',
        teamMembers: [
          {
            name: 'John Doe',
            initials: 'JD',
            avatar: '/images/avatars/avatar-10.webp'
          },
          {
            name: 'Anna Richard',
            initials: 'AR',
            avatar: '/images/avatars/avatar-11.webp'
          },
          {
            name: 'Bob Carter',
            initials: 'BC',
            avatar: '/images/avatars/avatar-12.webp'
          }
        ],
        teamExtraCount: 3
      },
      {
        id: 'act-016',
        description: 'Weekly report submitted',
        detail: 'Q2 performance summary sent to stakeholders',
        timestamp: '3 Day Ago'
      }
    ],
    billingPlan: {
      name: 'Basic',
      price: 99,
      period: 'month',
      isPopular: true,
      features: ['10 Users', 'Up to 10GB storage', 'Basic Support'],
      daysUsed: 26,
      totalDays: 30
    },
    invoices: [
      {
        id: 'inv-031',
        number: '#5051',
        status: 'paid',
        total: 1451,
        issuedDate: '2026-01-15T00:00:00.000Z'
      },
      {
        id: 'inv-032',
        number: '#5052',
        status: 'paid',
        total: 1872,
        issuedDate: '2026-02-10T00:00:00.000Z'
      },
      {
        id: 'inv-033',
        number: '#5053',
        status: 'paid',
        total: 2293,
        issuedDate: '2026-03-05T00:00:00.000Z'
      },
      {
        id: 'inv-034',
        number: '#5054',
        status: 'pending',
        total: 2714,
        issuedDate: '2026-03-28T00:00:00.000Z'
      },
      {
        id: 'inv-035',
        number: '#5055',
        status: 'pending',
        total: 3135,
        issuedDate: '2026-04-12T00:00:00.000Z'
      },
      {
        id: 'inv-036',
        number: '#5056',
        status: 'cancelled',
        total: 3556,
        issuedDate: '2026-05-01T00:00:00.000Z'
      }
    ],
    ...createUserViewProfile(4, 'Australia')
  },
  {
    id: 'user-005',
    name: 'Cyrill Risby',
    email: 'cyrill.risby4@example.com',
    role: 'Admin',
    plan: 'Basic',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'Globex LLC',
    country: 'Germany',
    contact: '+1 (555) 204-1052',
    joinedDate: '2022-09-30T00:00:00.000Z',
    avatar: '/images/avatars/avatar-5.webp',
    socialLinks: [
      {
        platform: 'github',
        url: 'https://github.com/crisby'
      },
      {
        platform: 'linkedin',
        url: 'https://linkedin.com/in/cyrill-risby'
      }
    ],
    tasksDone: 1492,
    projectsDone: 484,
    username: 'cyrillrisby',
    billingEmail: 'cyrillrisby.billing@finance.org',
    taxId: 'Tax-8868',
    language: 'English',
    projects: [
      {
        id: 'proj-041',
        name: 'Dashboard Design',
        type: 'Node Project',
        logo: '/images/brands/slack-icon.webp',
        leader: 'Priya',
        team: [
          {
            avatar: '/images/avatars/avatar-17.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-18.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 89,
        updatedAt: 'Updated 5 days ago'
      },
      {
        id: 'proj-042',
        name: 'Foodista Mobile App',
        type: 'React Project',
        logo: '/images/brands/google-icon.webp',
        leader: 'Tom',
        team: [
          {
            avatar: '/images/avatars/avatar-19.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-20.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 3,
        progress: 46,
        updatedAt: 'Updated 6 days ago'
      },
      {
        id: 'proj-043',
        name: 'Dojo Email App',
        type: 'Figma Project',
        logo: '/images/brands/figma-icon.webp',
        leader: 'Lisa',
        team: [
          {
            avatar: '/images/avatars/avatar-1.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-2.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 4,
        progress: 53,
        updatedAt: 'Updated 7 days ago'
      },
      {
        id: 'proj-044',
        name: 'Tailwind CSS Kit',
        type: 'Vue Project',
        logo: '/images/brands/notion-white.webp',
        leader: 'David',
        team: [
          {
            avatar: '/images/avatars/avatar-3.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-4.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 60,
        updatedAt: 'Updated 1 days ago'
      }
    ],
    activityLog: [
      {
        id: 'act-017',
        description: '14 Invoices have been paid',
        detail: 'Invoices have been paid to the company',
        timestamp: '12 min ago',
        attachment: {
          name: 'invoice.pdf',
          fileType: 'pdf'
        }
      },
      {
        id: 'act-018',
        description: 'Client Meeting',
        detail: 'Project meeting with john @10:15am',
        timestamp: '45 min ago',
        person: {
          name: 'Lester McCarthy (Client)',
          role: 'CEO of Pixinvent',
          avatar: '/images/avatars/avatar-5.webp',
          initials: 'LM'
        }
      },
      {
        id: 'act-019',
        description: 'Create a new project for client',
        detail: '6 team members in a project',
        timestamp: '2 Day Ago',
        teamMembers: [
          {
            name: 'John Doe',
            initials: 'JD',
            avatar: '/images/avatars/avatar-6.webp'
          },
          {
            name: 'Anna Richard',
            initials: 'AR',
            avatar: '/images/avatars/avatar-7.webp'
          },
          {
            name: 'Bob Carter',
            initials: 'BC',
            avatar: '/images/avatars/avatar-8.webp'
          }
        ],
        teamExtraCount: 3
      },
      {
        id: 'act-020',
        description: 'Order of the New Hand Bag',
        timestamp: '5 Day Ago'
      }
    ],
    billingPlan: {
      name: 'Basic',
      price: 99,
      period: 'month',
      isPopular: true,
      features: ['10 Users', 'Up to 10GB storage', 'Basic Support'],
      daysUsed: 26,
      totalDays: 30
    },
    invoices: [
      {
        id: 'inv-041',
        number: '#5058',
        status: 'paid',
        total: 1768,
        issuedDate: '2026-01-15T00:00:00.000Z'
      },
      {
        id: 'inv-042',
        number: '#5059',
        status: 'paid',
        total: 2189,
        issuedDate: '2026-02-10T00:00:00.000Z'
      },
      {
        id: 'inv-043',
        number: '#5060',
        status: 'pending',
        total: 2610,
        issuedDate: '2026-03-05T00:00:00.000Z'
      },
      {
        id: 'inv-044',
        number: '#5061',
        status: 'pending',
        total: 3031,
        issuedDate: '2026-03-28T00:00:00.000Z'
      },
      {
        id: 'inv-045',
        number: '#5062',
        status: 'cancelled',
        total: 3452,
        issuedDate: '2026-04-12T00:00:00.000Z'
      },
      {
        id: 'inv-046',
        number: '#5063',
        status: 'draft',
        total: 3873,
        issuedDate: '2026-05-01T00:00:00.000Z'
      },
      {
        id: 'inv-047',
        number: '#5064',
        status: 'paid',
        total: 4294,
        issuedDate: '2026-05-20T00:00:00.000Z'
      }
    ],
    ...createUserViewProfile(5, 'Germany')
  },
  {
    id: 'user-006',
    name: 'Maggy Hurran',
    email: 'maggy.hurran5@example.com',
    role: 'Admin',
    plan: 'Basic',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'Initech',
    country: 'France',
    contact: '+1 (555) 205-1065',
    joinedDate: '2022-11-12T00:00:00.000Z',
    avatar: '/images/avatars/avatar-6.webp',
    socialLinks: [
      {
        platform: 'twitter',
        url: 'https://twitter.com/mhurran'
      },
      {
        platform: 'instagram',
        url: 'https://instagram.com/mhurran'
      }
    ],
    tasksDone: 1665,
    projectsDone: 555,
    username: 'maggyhurran',
    billingEmail: 'maggyhurran.billing@billing.io',
    taxId: 'Tax-8885',
    language: 'English',
    projects: [
      {
        id: 'proj-051',
        name: 'BGC eCommerce App',
        type: 'React Project',
        logo: '/images/brands/asana-icon-circle.webp',
        leader: 'Tom',
        team: [
          {
            avatar: '/images/avatars/avatar-12.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-13.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 50,
        updatedAt: 'Updated 6 days ago'
      },
      {
        id: 'proj-052',
        name: 'Mobile Banking App',
        type: 'Figma Project',
        logo: '/images/brands/dropbox-icon-circle.webp',
        leader: 'Lisa',
        team: [
          {
            avatar: '/images/avatars/avatar-14.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-15.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 3,
        progress: 57,
        updatedAt: 'Updated 7 days ago'
      },
      {
        id: 'proj-053',
        name: 'Falcon Logo Design',
        type: 'Vue Project',
        logo: '/images/brands/slack-icon.webp',
        leader: 'David',
        team: [
          {
            avatar: '/images/avatars/avatar-16.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-17.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 4,
        progress: 64,
        updatedAt: 'Updated 1 days ago'
      },
      {
        id: 'proj-054',
        name: 'Dojo Email App',
        type: 'Angular Project',
        logo: '/images/brands/google-icon.webp',
        leader: 'Nina',
        team: [
          {
            avatar: '/images/avatars/avatar-18.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-19.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 71,
        updatedAt: 'Updated 2 days ago'
      },
      {
        id: 'proj-055',
        name: 'BGC eCommerce App',
        type: 'Node Project',
        logo: '/images/brands/figma-icon.webp',
        leader: 'Alex',
        team: [
          {
            avatar: '/images/avatars/avatar-20.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-1.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 3,
        progress: 78,
        updatedAt: 'Updated 3 days ago'
      }
    ],
    activityLog: [
      {
        id: 'act-021',
        description: '15 Invoices have been paid',
        detail: 'Invoices have been paid to the company',
        timestamp: '12 min ago',
        attachment: {
          name: 'invoice.pdf',
          fileType: 'pdf'
        }
      },
      {
        id: 'act-022',
        description: 'Client Meeting',
        detail: 'Project meeting with sarah @10:15am',
        timestamp: '45 min ago',
        person: {
          name: 'Lester McCarthy (Client)',
          role: 'CEO of Pixinvent',
          avatar: '/images/avatars/avatar-2.webp',
          initials: 'LM'
        }
      },
      {
        id: 'act-023',
        description: 'Create a new project for client',
        detail: '6 team members in a project',
        timestamp: '2 Day Ago',
        teamMembers: [
          {
            name: 'John Doe',
            initials: 'JD',
            avatar: '/images/avatars/avatar-3.webp'
          },
          {
            name: 'Anna Richard',
            initials: 'AR',
            avatar: '/images/avatars/avatar-4.webp'
          },
          {
            name: 'Bob Carter',
            initials: 'BC',
            avatar: '/images/avatars/avatar-5.webp'
          }
        ],
        teamExtraCount: 3
      },
      {
        id: 'act-024',
        description: 'Weekly report submitted',
        detail: 'Q2 performance summary sent to stakeholders',
        timestamp: '3 Day Ago'
      }
    ],
    billingPlan: {
      name: 'Basic',
      price: 99,
      period: 'month',
      isPopular: true,
      features: ['10 Users', 'Up to 10GB storage', 'Basic Support'],
      daysUsed: 26,
      totalDays: 30
    },
    invoices: [
      {
        id: 'inv-051',
        number: '#5065',
        status: 'paid',
        total: 2085,
        issuedDate: '2026-01-15T00:00:00.000Z'
      },
      {
        id: 'inv-052',
        number: '#5066',
        status: 'pending',
        total: 2506,
        issuedDate: '2026-02-10T00:00:00.000Z'
      },
      {
        id: 'inv-053',
        number: '#5067',
        status: 'pending',
        total: 2927,
        issuedDate: '2026-03-05T00:00:00.000Z'
      },
      {
        id: 'inv-054',
        number: '#5068',
        status: 'cancelled',
        total: 3348,
        issuedDate: '2026-03-28T00:00:00.000Z'
      },
      {
        id: 'inv-055',
        number: '#5069',
        status: 'draft',
        total: 3769,
        issuedDate: '2026-04-12T00:00:00.000Z'
      },
      {
        id: 'inv-056',
        number: '#5070',
        status: 'paid',
        total: 4190,
        issuedDate: '2026-05-01T00:00:00.000Z'
      },
      {
        id: 'inv-057',
        number: '#5071',
        status: 'paid',
        total: 4611,
        issuedDate: '2026-05-20T00:00:00.000Z'
      },
      {
        id: 'inv-058',
        number: '#5072',
        status: 'paid',
        total: 5032,
        issuedDate: '2026-06-19T00:00:00.000Z'
      }
    ],
    ...createUserViewProfile(6, 'France')
  },
  {
    id: 'user-007',
    name: 'Silvain Halstead',
    email: 'silvain.halstead6@example.com',
    role: 'Editor',
    plan: 'Basic',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'Umbrella Co',
    country: 'India',
    contact: '+1 (555) 206-1078',
    joinedDate: '2023-01-25T00:00:00.000Z',
    avatar: '/images/avatars/avatar-7.webp',
    socialLinks: [
      {
        platform: 'linkedin',
        url: 'https://linkedin.com/in/silvain-halstead'
      },
      {
        platform: 'github',
        url: 'https://github.com/shalstead'
      }
    ],
    tasksDone: 1838,
    projectsDone: 626,
    username: 'silvainhalstead',
    billingEmail: 'silvainhalstead.billing@accounts.co',
    taxId: 'Tax-8902',
    language: 'Spanish',
    projects: [
      {
        id: 'proj-061',
        name: 'Tailwind CSS Kit',
        type: 'Figma Project',
        logo: '/images/brands/notion-white.webp',
        leader: 'Lisa',
        team: [
          {
            avatar: '/images/avatars/avatar-10.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-11.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 61,
        updatedAt: 'Updated 7 days ago'
      },
      {
        id: 'proj-062',
        name: 'Admin Template Pro',
        type: 'Vue Project',
        logo: '/images/brands/asana-icon-circle.webp',
        leader: 'David',
        team: [
          {
            avatar: '/images/avatars/avatar-12.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-13.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 3,
        progress: 68,
        updatedAt: 'Updated 1 days ago'
      },
      {
        id: 'proj-063',
        name: 'Dashboard Design',
        type: 'Angular Project',
        logo: '/images/brands/dropbox-icon-circle.webp',
        leader: 'Nina',
        team: [
          {
            avatar: '/images/avatars/avatar-14.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-15.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 4,
        progress: 75,
        updatedAt: 'Updated 2 days ago'
      },
      {
        id: 'proj-064',
        name: 'Foodista Mobile App',
        type: 'Node Project',
        logo: '/images/brands/slack-icon.webp',
        leader: 'Alex',
        team: [
          {
            avatar: '/images/avatars/avatar-16.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-17.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 82,
        updatedAt: 'Updated 3 days ago'
      },
      {
        id: 'proj-065',
        name: 'BGC eCommerce App',
        type: 'React Project',
        logo: '/images/brands/google-icon.webp',
        leader: 'Eileen',
        team: [
          {
            avatar: '/images/avatars/avatar-18.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-19.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 3,
        progress: 89,
        updatedAt: 'Updated 4 days ago'
      },
      {
        id: 'proj-066',
        name: 'Tailwind CSS Kit',
        type: 'Figma Project',
        logo: '/images/brands/figma-icon.webp',
        leader: 'James',
        team: [
          {
            avatar: '/images/avatars/avatar-20.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-1.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 4,
        progress: 46,
        updatedAt: 'Updated 5 days ago'
      }
    ],
    activityLog: [
      {
        id: 'act-025',
        description: '16 Invoices have been paid',
        detail: 'Invoices have been paid to the company',
        timestamp: '12 min ago',
        attachment: {
          name: 'invoice.pdf',
          fileType: 'pdf'
        }
      },
      {
        id: 'act-026',
        description: 'Client Meeting',
        detail: 'Project meeting with alex @10:15am',
        timestamp: '45 min ago',
        person: {
          name: 'Lester McCarthy (Client)',
          role: 'CEO of Pixinvent',
          avatar: '/images/avatars/avatar-2.webp',
          initials: 'LM'
        }
      },
      {
        id: 'act-027',
        description: 'Create a new project for client',
        detail: '6 team members in a project',
        timestamp: '2 Day Ago',
        teamMembers: [
          {
            name: 'John Doe',
            initials: 'JD',
            avatar: '/images/avatars/avatar-3.webp'
          },
          {
            name: 'Anna Richard',
            initials: 'AR',
            avatar: '/images/avatars/avatar-4.webp'
          },
          {
            name: 'Bob Carter',
            initials: 'BC',
            avatar: '/images/avatars/avatar-5.webp'
          }
        ],
        teamExtraCount: 3
      },
      {
        id: 'act-028',
        description: 'Order of the New Hand Bag',
        timestamp: '5 Day Ago'
      }
    ],
    billingPlan: {
      name: 'Basic',
      price: 99,
      period: 'month',
      isPopular: true,
      features: ['10 Users', 'Up to 10GB storage', 'Basic Support'],
      daysUsed: 26,
      totalDays: 30
    },
    invoices: [
      {
        id: 'inv-061',
        number: '#5072',
        status: 'pending',
        total: 2402,
        issuedDate: '2026-01-15T00:00:00.000Z'
      },
      {
        id: 'inv-062',
        number: '#5073',
        status: 'pending',
        total: 2823,
        issuedDate: '2026-02-10T00:00:00.000Z'
      },
      {
        id: 'inv-063',
        number: '#5074',
        status: 'cancelled',
        total: 3244,
        issuedDate: '2026-03-05T00:00:00.000Z'
      },
      {
        id: 'inv-064',
        number: '#5075',
        status: 'draft',
        total: 3665,
        issuedDate: '2026-03-28T00:00:00.000Z'
      },
      {
        id: 'inv-065',
        number: '#5076',
        status: 'paid',
        total: 4086,
        issuedDate: '2026-04-12T00:00:00.000Z'
      },
      {
        id: 'inv-066',
        number: '#5077',
        status: 'paid',
        total: 4507,
        issuedDate: '2026-05-01T00:00:00.000Z'
      }
    ],
    ...createUserViewProfile(7, 'India')
  },
  {
    id: 'user-008',
    name: 'Breena Gallemore',
    email: 'breena.gallemore7@example.com',
    role: 'Editor',
    plan: 'Basic',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'Stark Industries',
    country: 'Japan',
    contact: '+1 (555) 207-1091',
    joinedDate: '2023-04-03T00:00:00.000Z',
    avatar: '/images/avatars/avatar-8.webp',
    socialLinks: [
      {
        platform: 'dribbble',
        url: 'https://dribbble.com/bgallemore'
      },
      {
        platform: 'behance',
        url: 'https://behance.net/bgallemore'
      }
    ],
    tasksDone: 2011,
    projectsDone: 697,
    username: 'breenagallemore',
    billingEmail: 'breenagallemore.billing@invoice.net',
    taxId: 'Tax-8919',
    language: 'French',
    projects: [
      {
        id: 'proj-071',
        name: 'Figma UI Kit',
        type: 'Vue Project',
        logo: '/images/brands/notion-white.webp',
        leader: 'David',
        team: [
          {
            avatar: '/images/avatars/avatar-9.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-10.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 72,
        updatedAt: 'Updated 1 days ago'
      },
      {
        id: 'proj-072',
        name: 'Dojo Email App',
        type: 'Angular Project',
        logo: '/images/brands/asana-icon-circle.webp',
        leader: 'Nina',
        team: [
          {
            avatar: '/images/avatars/avatar-11.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-12.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 3,
        progress: 79,
        updatedAt: 'Updated 2 days ago'
      },
      {
        id: 'proj-073',
        name: 'Falcon Logo Design',
        type: 'Node Project',
        logo: '/images/brands/dropbox-icon-circle.webp',
        leader: 'Alex',
        team: [
          {
            avatar: '/images/avatars/avatar-13.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-14.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 4,
        progress: 86,
        updatedAt: 'Updated 3 days ago'
      },
      {
        id: 'proj-074',
        name: 'Mobile Banking App',
        type: 'React Project',
        logo: '/images/brands/slack-icon.webp',
        leader: 'Eileen',
        team: [
          {
            avatar: '/images/avatars/avatar-15.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-16.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 93,
        updatedAt: 'Updated 4 days ago'
      },
      {
        id: 'proj-075',
        name: 'Figma UI Kit',
        type: 'Figma Project',
        logo: '/images/brands/google-icon.webp',
        leader: 'James',
        team: [
          {
            avatar: '/images/avatars/avatar-17.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-18.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 3,
        progress: 50,
        updatedAt: 'Updated 5 days ago'
      },
      {
        id: 'proj-076',
        name: 'Dojo Email App',
        type: 'Vue Project',
        logo: '/images/brands/figma-icon.webp',
        leader: 'Sarah',
        team: [
          {
            avatar: '/images/avatars/avatar-19.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-20.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 4,
        progress: 57,
        updatedAt: 'Updated 6 days ago'
      },
      {
        id: 'proj-077',
        name: 'Falcon Logo Design',
        type: 'Angular Project',
        logo: '/images/brands/notion-white.webp',
        leader: 'Marcus',
        team: [
          {
            avatar: '/images/avatars/avatar-1.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-2.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 64,
        updatedAt: 'Updated 7 days ago'
      }
    ],
    activityLog: [
      {
        id: 'act-029',
        description: '17 Invoices have been paid',
        detail: 'Invoices have been paid to the company',
        timestamp: '12 min ago',
        attachment: {
          name: 'invoice.pdf',
          fileType: 'pdf'
        }
      },
      {
        id: 'act-030',
        description: 'Client Meeting',
        detail: 'Project meeting with maria @10:15am',
        timestamp: '45 min ago',
        person: {
          name: 'Lester McCarthy (Client)',
          role: 'CEO of Pixinvent',
          avatar: '/images/avatars/avatar-3.webp',
          initials: 'LM'
        }
      },
      {
        id: 'act-031',
        description: 'Create a new project for client',
        detail: '6 team members in a project',
        timestamp: '2 Day Ago',
        teamMembers: [
          {
            name: 'John Doe',
            initials: 'JD',
            avatar: '/images/avatars/avatar-4.webp'
          },
          {
            name: 'Anna Richard',
            initials: 'AR',
            avatar: '/images/avatars/avatar-5.webp'
          },
          {
            name: 'Bob Carter',
            initials: 'BC',
            avatar: '/images/avatars/avatar-6.webp'
          }
        ],
        teamExtraCount: 3
      },
      {
        id: 'act-032',
        description: 'Weekly report submitted',
        detail: 'Q2 performance summary sent to stakeholders',
        timestamp: '3 Day Ago'
      }
    ],
    billingPlan: {
      name: 'Basic',
      price: 99,
      period: 'month',
      isPopular: true,
      features: ['10 Users', 'Up to 10GB storage', 'Basic Support'],
      daysUsed: 26,
      totalDays: 30
    },
    invoices: [
      {
        id: 'inv-071',
        number: '#5079',
        status: 'pending',
        total: 2719,
        issuedDate: '2026-01-15T00:00:00.000Z'
      },
      {
        id: 'inv-072',
        number: '#5080',
        status: 'cancelled',
        total: 3140,
        issuedDate: '2026-02-10T00:00:00.000Z'
      },
      {
        id: 'inv-073',
        number: '#5081',
        status: 'draft',
        total: 3561,
        issuedDate: '2026-03-05T00:00:00.000Z'
      },
      {
        id: 'inv-074',
        number: '#5082',
        status: 'paid',
        total: 3982,
        issuedDate: '2026-03-28T00:00:00.000Z'
      },
      {
        id: 'inv-075',
        number: '#5083',
        status: 'paid',
        total: 4403,
        issuedDate: '2026-04-12T00:00:00.000Z'
      },
      {
        id: 'inv-076',
        number: '#5084',
        status: 'paid',
        total: 4824,
        issuedDate: '2026-05-01T00:00:00.000Z'
      },
      {
        id: 'inv-077',
        number: '#5085',
        status: 'paid',
        total: 5245,
        issuedDate: '2026-05-20T00:00:00.000Z'
      }
    ],
    ...createUserViewProfile(8, 'Japan')
  },
  {
    id: 'user-009',
    name: 'Kathryne Litterick',
    email: 'kathryne.litterick8@example.com',
    role: 'Editor',
    plan: 'Basic',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'Wayne Enterprises',
    country: 'Brazil',
    contact: '+1 (555) 208-1104',
    joinedDate: '2023-06-17T00:00:00.000Z',
    avatar: '/images/avatars/avatar-9.webp',
    socialLinks: [
      {
        platform: 'twitter',
        url: 'https://twitter.com/klitterick'
      },
      {
        platform: 'linkedin',
        url: 'https://linkedin.com/in/kathryne-litterick'
      }
    ],
    tasksDone: 2184,
    projectsDone: 768,
    username: 'kathrynelitterick',
    billingEmail: 'kathrynelitterick.billing@paymail.com',
    taxId: 'Tax-8936',
    language: 'German',
    projects: [
      {
        id: 'proj-081',
        name: 'BGC eCommerce App',
        type: 'Angular Project',
        logo: '/images/brands/asana-icon-circle.webp',
        leader: 'Nina',
        team: [
          {
            avatar: '/images/avatars/avatar-11.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-12.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 83,
        updatedAt: 'Updated 2 days ago'
      },
      {
        id: 'proj-082',
        name: 'Dashboard Design',
        type: 'Node Project',
        logo: '/images/brands/dropbox-icon-circle.webp',
        leader: 'Alex',
        team: [
          {
            avatar: '/images/avatars/avatar-13.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-14.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 3,
        progress: 90,
        updatedAt: 'Updated 3 days ago'
      },
      {
        id: 'proj-083',
        name: 'Tailwind CSS Kit',
        type: 'React Project',
        logo: '/images/brands/slack-icon.webp',
        leader: 'Eileen',
        team: [
          {
            avatar: '/images/avatars/avatar-15.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-16.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 4,
        progress: 47,
        updatedAt: 'Updated 4 days ago'
      },
      {
        id: 'proj-084',
        name: 'Admin Template Pro',
        type: 'Figma Project',
        logo: '/images/brands/google-icon.webp',
        leader: 'James',
        team: [
          {
            avatar: '/images/avatars/avatar-17.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-18.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 54,
        updatedAt: 'Updated 5 days ago'
      }
    ],
    activityLog: [
      {
        id: 'act-033',
        description: '18 Invoices have been paid',
        detail: 'Invoices have been paid to the company',
        timestamp: '12 min ago',
        attachment: {
          name: 'invoice.pdf',
          fileType: 'pdf'
        }
      },
      {
        id: 'act-034',
        description: 'Client Meeting',
        detail: 'Project meeting with john @10:15am',
        timestamp: '45 min ago',
        person: {
          name: 'Lester McCarthy (Client)',
          role: 'CEO of Pixinvent',
          avatar: '/images/avatars/avatar-19.webp',
          initials: 'LM'
        }
      },
      {
        id: 'act-035',
        description: 'Create a new project for client',
        detail: '6 team members in a project',
        timestamp: '2 Day Ago',
        teamMembers: [
          {
            name: 'John Doe',
            initials: 'JD',
            avatar: '/images/avatars/avatar-20.webp'
          },
          {
            name: 'Anna Richard',
            initials: 'AR',
            avatar: '/images/avatars/avatar-1.webp'
          },
          {
            name: 'Bob Carter',
            initials: 'BC',
            avatar: '/images/avatars/avatar-2.webp'
          }
        ],
        teamExtraCount: 3
      },
      {
        id: 'act-036',
        description: 'Order of the New Hand Bag',
        timestamp: '5 Day Ago'
      }
    ],
    billingPlan: {
      name: 'Basic',
      price: 99,
      period: 'month',
      isPopular: true,
      features: ['10 Users', 'Up to 10GB storage', 'Basic Support'],
      daysUsed: 26,
      totalDays: 30
    },
    invoices: [
      {
        id: 'inv-081',
        number: '#5086',
        status: 'cancelled',
        total: 3036,
        issuedDate: '2026-01-15T00:00:00.000Z'
      },
      {
        id: 'inv-082',
        number: '#5087',
        status: 'draft',
        total: 3457,
        issuedDate: '2026-02-10T00:00:00.000Z'
      },
      {
        id: 'inv-083',
        number: '#5088',
        status: 'paid',
        total: 3878,
        issuedDate: '2026-03-05T00:00:00.000Z'
      },
      {
        id: 'inv-084',
        number: '#5089',
        status: 'paid',
        total: 4299,
        issuedDate: '2026-03-28T00:00:00.000Z'
      },
      {
        id: 'inv-085',
        number: '#5090',
        status: 'paid',
        total: 4720,
        issuedDate: '2026-04-12T00:00:00.000Z'
      },
      {
        id: 'inv-086',
        number: '#5091',
        status: 'paid',
        total: 5141,
        issuedDate: '2026-05-01T00:00:00.000Z'
      },
      {
        id: 'inv-087',
        number: '#5092',
        status: 'paid',
        total: 5562,
        issuedDate: '2026-05-20T00:00:00.000Z'
      },
      {
        id: 'inv-088',
        number: '#5093',
        status: 'paid',
        total: 5983,
        issuedDate: '2026-06-19T00:00:00.000Z'
      }
    ],
    ...createUserViewProfile(9, 'Brazil')
  },
  {
    id: 'user-010',
    name: 'Elke Klasen',
    email: 'elke.klasen9@example.com',
    role: 'Editor',
    plan: 'Basic',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'Hooli',
    country: 'Netherlands',
    contact: '+1 (555) 209-1117',
    joinedDate: '2023-08-29T00:00:00.000Z',
    avatar: '/images/avatars/avatar-10.webp',
    socialLinks: [
      {
        platform: 'github',
        url: 'https://github.com/eklasen'
      },
      {
        platform: 'linkedin',
        url: 'https://linkedin.com/in/elke-klasen'
      },
      {
        platform: 'facebook',
        url: 'https://facebook.com/eklasen'
      }
    ],
    tasksDone: 2357,
    projectsDone: 839,
    username: 'elkeklasen',
    billingEmail: 'elkeklasen.billing@finance.org',
    taxId: 'Tax-8953',
    language: 'English',
    projects: [
      {
        id: 'proj-091',
        name: 'Admin Template Pro',
        type: 'Node Project',
        logo: '/images/brands/figma-icon.webp',
        leader: 'Alex',
        team: [
          {
            avatar: '/images/avatars/avatar-7.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-8.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 94,
        updatedAt: 'Updated 3 days ago'
      },
      {
        id: 'proj-092',
        name: 'Mobile Banking App',
        type: 'React Project',
        logo: '/images/brands/notion-white.webp',
        leader: 'Eileen',
        team: [
          {
            avatar: '/images/avatars/avatar-9.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-10.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 3,
        progress: 51,
        updatedAt: 'Updated 4 days ago'
      },
      {
        id: 'proj-093',
        name: 'Falcon Logo Design',
        type: 'Figma Project',
        logo: '/images/brands/asana-icon-circle.webp',
        leader: 'James',
        team: [
          {
            avatar: '/images/avatars/avatar-11.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-12.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 4,
        progress: 58,
        updatedAt: 'Updated 5 days ago'
      },
      {
        id: 'proj-094',
        name: 'BGC eCommerce App',
        type: 'Vue Project',
        logo: '/images/brands/dropbox-icon-circle.webp',
        leader: 'Sarah',
        team: [
          {
            avatar: '/images/avatars/avatar-13.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-14.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 2,
        progress: 65,
        updatedAt: 'Updated 6 days ago'
      },
      {
        id: 'proj-095',
        name: 'Dashboard Design',
        type: 'Angular Project',
        logo: '/images/brands/slack-icon.webp',
        leader: 'Marcus',
        team: [
          {
            avatar: '/images/avatars/avatar-15.webp',
            initials: 'ET'
          },
          {
            avatar: '/images/avatars/avatar-16.webp',
            initials: 'JM'
          },
          {
            initials: 'AK'
          }
        ],
        teamExtraCount: 3,
        progress: 72,
        updatedAt: 'Updated 7 days ago'
      }
    ],
    activityLog: [
      {
        id: 'act-037',
        description: '19 Invoices have been paid',
        detail: 'Invoices have been paid to the company',
        timestamp: '12 min ago',
        attachment: {
          name: 'invoice.pdf',
          fileType: 'pdf'
        }
      },
      {
        id: 'act-038',
        description: 'Client Meeting',
        detail: 'Project meeting with sarah @10:15am',
        timestamp: '45 min ago',
        person: {
          name: 'Lester McCarthy (Client)',
          role: 'CEO of Pixinvent',
          avatar: '/images/avatars/avatar-17.webp',
          initials: 'LM'
        }
      },
      {
        id: 'act-039',
        description: 'Create a new project for client',
        detail: '6 team members in a project',
        timestamp: '2 Day Ago',
        teamMembers: [
          {
            name: 'John Doe',
            initials: 'JD',
            avatar: '/images/avatars/avatar-18.webp'
          },
          {
            name: 'Anna Richard',
            initials: 'AR',
            avatar: '/images/avatars/avatar-19.webp'
          },
          {
            name: 'Bob Carter',
            initials: 'BC',
            avatar: '/images/avatars/avatar-20.webp'
          }
        ],
        teamExtraCount: 3
      },
      {
        id: 'act-040',
        description: 'Weekly report submitted',
        detail: 'Q2 performance summary sent to stakeholders',
        timestamp: '3 Day Ago'
      }
    ],
    billingPlan: {
      name: 'Basic',
      price: 99,
      period: 'month',
      isPopular: true,
      features: ['10 Users', 'Up to 10GB storage', 'Basic Support'],
      daysUsed: 26,
      totalDays: 30
    },
    invoices: [
      {
        id: 'inv-091',
        number: '#5093',
        status: 'draft',
        total: 3353,
        issuedDate: '2026-01-15T00:00:00.000Z'
      },
      {
        id: 'inv-092',
        number: '#5094',
        status: 'paid',
        total: 3774,
        issuedDate: '2026-02-10T00:00:00.000Z'
      },
      {
        id: 'inv-093',
        number: '#5095',
        status: 'paid',
        total: 4195,
        issuedDate: '2026-03-05T00:00:00.000Z'
      },
      {
        id: 'inv-094',
        number: '#5096',
        status: 'paid',
        total: 4616,
        issuedDate: '2026-03-28T00:00:00.000Z'
      },
      {
        id: 'inv-095',
        number: '#5097',
        status: 'paid',
        total: 5037,
        issuedDate: '2026-04-12T00:00:00.000Z'
      },
      {
        id: 'inv-096',
        number: '#5098',
        status: 'paid',
        total: 5458,
        issuedDate: '2026-05-01T00:00:00.000Z'
      }
    ],
    ...createUserViewProfile(10, 'Netherlands')
  },
  {
    id: 'user-011',
    name: 'Darryl Bickford',
    email: 'darryl.bickford10@example.com',
    role: 'Editor',
    plan: 'Basic',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'Massive Dynamic',
    country: 'Sweden',
    contact: '+1 (555) 210-1130',
    joinedDate: '2023-10-11T00:00:00.000Z',
    avatar: '/images/avatars/avatar-11.webp'
  },
  {
    id: 'user-012',
    name: 'Orville Harnwell',
    email: 'orville.harnwell11@example.com',
    role: 'Editor',
    plan: 'Basic',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'Cyberdyne Systems',
    country: 'Spain',
    contact: '+1 (555) 211-1143',
    joinedDate: '2023-12-05T00:00:00.000Z',
    avatar: '/images/avatars/avatar-12.webp'
  },
  {
    id: 'user-013',
    name: 'Adriena MacRury',
    email: 'adriena.macrury12@example.com',
    role: 'Editor',
    plan: 'Basic',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'Oscorp',
    country: 'Italy',
    contact: '+1 (555) 212-1156',
    joinedDate: '2024-02-18T00:00:00.000Z',
    avatar: '/images/avatars/avatar-13.webp'
  },
  {
    id: 'user-014',
    name: 'Vladamir Koschek',
    email: 'vladamir.koschek13@example.com',
    role: 'Editor',
    plan: 'Basic',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'LexCorp',
    country: 'Mexico',
    contact: '+1 (555) 213-1169',
    joinedDate: '2024-04-27T00:00:00.000Z',
    avatar: '/images/avatars/avatar-14.webp'
  },
  {
    id: 'user-015',
    name: 'Corrie Perham',
    email: 'corrie.perham14@example.com',
    role: 'Subscriber',
    plan: 'Basic',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'Monarch Solutions',
    country: 'Singapore',
    contact: '+1 (555) 214-1182',
    joinedDate: '2024-06-09T00:00:00.000Z',
    avatar: '/images/avatars/avatar-15.webp'
  },
  {
    id: 'user-016',
    name: 'Saunder Offner',
    email: 'saunder.offner15@example.com',
    role: 'Subscriber',
    plan: 'Basic',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'Vandelay Industries',
    country: 'South Korea',
    contact: '+1 (555) 215-1195',
    joinedDate: '2024-08-21T00:00:00.000Z',
    avatar: '/images/avatars/avatar-16.webp'
  },
  {
    id: 'user-017',
    name: 'Karena Courtenay',
    email: 'karena.courtenay16@example.com',
    role: 'Subscriber',
    plan: 'Basic',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'Prestige Worldwide',
    country: 'Ireland',
    contact: '+1 (555) 216-1208',
    joinedDate: '2024-10-02T00:00:00.000Z',
    avatar: '/images/avatars/avatar-17.webp'
  },
  {
    id: 'user-018',
    name: 'Onfre Hailey',
    email: 'onfre.hailey17@example.com',
    role: 'Subscriber',
    plan: 'Basic',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'Dunder Mifflin',
    country: 'New Zealand',
    contact: '+1 (555) 217-1221',
    joinedDate: '2024-12-16T00:00:00.000Z',
    avatar: '/images/avatars/avatar-18.webp'
  },
  {
    id: 'user-019',
    name: 'Paulie Durber',
    email: 'paulie.durber18@example.com',
    role: 'Subscriber',
    plan: 'Basic',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'Pied Piper',
    country: 'Switzerland',
    contact: '+1 (555) 218-1234',
    joinedDate: '2025-01-08T00:00:00.000Z',
    avatar: '/images/avatars/avatar-19.webp'
  },
  {
    id: 'user-020',
    name: 'Perry Giraudy',
    email: 'perry.giraudy19@example.com',
    role: 'Subscriber',
    plan: 'Basic',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'Aviato',
    country: 'Belgium',
    contact: '+1 (555) 219-1247',
    joinedDate: '2025-02-14T00:00:00.000Z',
    avatar: '/images/avatars/avatar-20.webp'
  },
  {
    id: 'user-021',
    name: 'Nickie Bolderson',
    email: 'nickie.bolderson20@example.com',
    role: 'Subscriber',
    plan: 'Basic',
    status: 'Active',
    billing: 'Manual',
    company: 'Bluth Company',
    country: 'Norway',
    contact: '+1 (555) 220-1260',
    joinedDate: '2025-03-01T00:00:00.000Z',
    avatar: '/images/avatars/avatar-1.webp'
  },
  {
    id: 'user-022',
    name: 'Minna Amiss',
    email: 'minna.amiss21@example.com',
    role: 'Subscriber',
    plan: 'Team',
    status: 'Active',
    billing: 'Manual',
    company: 'Soylent Corp',
    country: 'Denmark',
    contact: '+1 (555) 221-1273',
    joinedDate: '2022-02-20T00:00:00.000Z',
    avatar: '/images/avatars/avatar-2.webp'
  },
  {
    id: 'user-023',
    name: 'Abie Enderwick',
    email: 'abie.enderwick22@example.com',
    role: 'Subscriber',
    plan: 'Team',
    status: 'Active',
    billing: 'Manual',
    company: 'Gringotts Bank',
    country: 'Finland',
    contact: '+1 (555) 222-1286',
    joinedDate: '2022-04-15T00:00:00.000Z',
    avatar: '/images/avatars/avatar-3.webp'
  },
  {
    id: 'user-024',
    name: 'Matthieu MacPeake',
    email: 'matthieu.macpeake23@example.com',
    role: 'Subscriber',
    plan: 'Team',
    status: 'Active',
    billing: 'Manual',
    company: 'Wonka Industries',
    country: 'Portugal',
    contact: '+1 (555) 223-1299',
    joinedDate: '2022-06-28T00:00:00.000Z',
    avatar: '/images/avatars/avatar-4.webp'
  },
  {
    id: 'user-025',
    name: 'Ann-Marie Prosch',
    email: 'annmarie.prosch24@example.com',
    role: 'Subscriber',
    plan: 'Team',
    status: 'Active',
    billing: 'Manual',
    company: 'Tyrell Corp',
    country: 'Austria',
    contact: '+1 (555) 224-1312',
    joinedDate: '2022-08-07T00:00:00.000Z',
    avatar: '/images/avatars/avatar-5.webp'
  },
  {
    id: 'user-026',
    name: 'Almire Rosebotham',
    email: 'almire.rosebotham25@example.com',
    role: 'Subscriber',
    plan: 'Team',
    status: 'Active',
    billing: 'Manual',
    company: 'Aperture Science',
    country: 'Poland',
    contact: '+1 (555) 225-1325',
    joinedDate: '2022-10-24T00:00:00.000Z',
    avatar: '/images/avatars/avatar-6.webp'
  },
  {
    id: 'user-027',
    name: 'Thorvald Orsi',
    email: 'thorvald.orsi26@example.com',
    role: 'Subscriber',
    plan: 'Team',
    status: 'Active',
    billing: 'Manual',
    company: 'Black Mesa',
    country: 'Argentina',
    contact: '+1 (555) 226-1338',
    joinedDate: '2022-12-31T00:00:00.000Z',
    avatar: '/images/avatars/avatar-7.webp'
  },
  {
    id: 'user-028',
    name: 'Christy MacMarcuis',
    email: 'christy.macmarcuis27@example.com',
    role: 'Subscriber',
    plan: 'Team',
    status: 'Active',
    billing: 'Manual',
    company: 'Vault-Tec',
    country: 'Chile',
    contact: '+1 (555) 227-1351',
    joinedDate: '2023-02-09T00:00:00.000Z',
    avatar: '/images/avatars/avatar-8.webp'
  },
  {
    id: 'user-029',
    name: 'Gabbie McAsgill',
    email: 'gabbie.mcasgill28@example.com',
    role: 'Subscriber',
    plan: 'Team',
    status: 'Active',
    billing: 'Manual',
    company: 'Abstergo',
    country: 'South Africa',
    contact: '+1 (555) 228-1364',
    joinedDate: '2023-05-16T00:00:00.000Z',
    avatar: '/images/avatars/avatar-9.webp'
  },
  {
    id: 'user-030',
    name: 'Jillana McGonagle',
    email: 'jillana.mcgonagle29@example.com',
    role: 'Subscriber',
    plan: 'Team',
    status: 'Active',
    billing: 'Manual',
    company: 'Omni Consumer Products',
    country: 'UAE',
    contact: '+1 (555) 229-1377',
    joinedDate: '2023-07-23T00:00:00.000Z',
    avatar: '/images/avatars/avatar-10.webp'
  },
  {
    id: 'user-031',
    name: 'Jonah Wharlton',
    email: 'jonah.wharlton30@example.com',
    role: 'Subscriber',
    plan: 'Team',
    status: 'Active',
    billing: 'Manual',
    company: 'Nakatomi Trading',
    country: 'Israel',
    contact: '+1 (555) 230-1390',
    joinedDate: '2023-09-04T00:00:00.000Z'
  },
  {
    id: 'user-032',
    name: 'Seth Halladay',
    email: 'seth.halladay31@example.com',
    role: 'Subscriber',
    plan: 'Team',
    status: 'Active',
    billing: 'Manual',
    company: 'Buy n Large',
    country: 'Thailand',
    contact: '+1 (555) 231-1403',
    joinedDate: '2023-11-18T00:00:00.000Z'
  },
  {
    id: 'user-033',
    name: 'Yvonne McFfaden',
    email: 'yvonne.mcffaden32@example.com',
    role: 'Subscriber',
    plan: 'Team',
    status: 'Active',
    billing: 'Manual',
    company: 'InGen',
    country: 'Malaysia',
    contact: '+1 (555) 232-1416',
    joinedDate: '2024-01-30T00:00:00.000Z'
  },
  {
    id: 'user-034',
    name: 'Babbie Cassius',
    email: 'babbie.cassius33@example.com',
    role: 'Subscriber',
    plan: 'Team',
    status: 'Active',
    billing: 'Manual',
    company: 'Weyland-Yutani',
    country: 'Philippines',
    contact: '+1 (555) 233-1429',
    joinedDate: '2024-03-12T00:00:00.000Z'
  },
  {
    id: 'user-035',
    name: 'Stevy Bramsen',
    email: 'stevy.bramsen34@example.com',
    role: 'Maintainer',
    plan: 'Team',
    status: 'Active',
    billing: 'Manual',
    company: 'MomCorp',
    country: 'Indonesia',
    contact: '+1 (555) 234-1442',
    joinedDate: '2024-05-25T00:00:00.000Z'
  },
  {
    id: 'user-036',
    name: 'Bernhard Perett',
    email: 'bernhard.perett35@example.com',
    role: 'Maintainer',
    plan: 'Team',
    status: 'Active',
    billing: 'Credit Card',
    company: 'Planet Express',
    country: 'Czech Republic',
    contact: '+1 (555) 235-1455',
    joinedDate: '2024-07-06T00:00:00.000Z'
  },
  {
    id: 'user-037',
    name: 'Emelia Garlett',
    email: 'emelia.garlett36@example.com',
    role: 'Maintainer',
    plan: 'Team',
    status: 'Pending',
    billing: 'Credit Card',
    company: 'Spacely Sprockets',
    country: 'Hungary',
    contact: '+1 (555) 236-1468',
    joinedDate: '2024-09-19T00:00:00.000Z'
  },
  {
    id: 'user-038',
    name: 'Allx Deluze',
    email: 'allx.deluze37@example.com',
    role: 'Maintainer',
    plan: 'Team',
    status: 'Pending',
    billing: 'Credit Card',
    company: 'Cogswell Cogs',
    country: 'Romania',
    contact: '+1 (555) 237-1481',
    joinedDate: '2024-11-28T00:00:00.000Z'
  },
  {
    id: 'user-039',
    name: 'Lind Dionisetti',
    email: 'lind.dionisetti38@example.com',
    role: 'Maintainer',
    plan: 'Team',
    status: 'Pending',
    billing: 'Credit Card',
    company: 'Duff Beer',
    country: 'Greece',
    contact: '+1 (555) 238-1494',
    joinedDate: '2025-01-22T00:00:00.000Z'
  },
  {
    id: 'user-040',
    name: 'Whitney Wisniowski',
    email: 'whitney.wisniowski39@example.com',
    role: 'Maintainer',
    plan: 'Enterprise',
    status: 'Pending',
    billing: 'Credit Card',
    company: 'Krusty Burger',
    country: 'Turkey',
    contact: '+1 (555) 239-1507',
    joinedDate: '2025-03-30T00:00:00.000Z'
  },
  {
    id: 'user-041',
    name: 'Reeba Wickwar',
    email: 'reeba.wickwar40@example.com',
    role: 'Maintainer',
    plan: 'Enterprise',
    status: 'Pending',
    billing: 'Credit Card',
    company: 'Springfield Nuclear',
    country: 'Egypt',
    contact: '+1 (555) 240-1520',
    joinedDate: '2025-04-11T00:00:00.000Z'
  },
  {
    id: 'user-042',
    name: 'Derk Winsome',
    email: 'derk.winsome41@example.com',
    role: 'Maintainer',
    plan: 'Enterprise',
    status: 'Pending',
    billing: 'Credit Card',
    company: 'Central Perk',
    country: 'Nigeria',
    contact: '+1 (555) 241-1533',
    joinedDate: '2025-05-19T00:00:00.000Z'
  },
  {
    id: 'user-043',
    name: 'Jillene Acuna',
    email: 'jillene.acuna42@example.com',
    role: 'Maintainer',
    plan: 'Enterprise',
    status: 'Suspended',
    billing: 'Credit Card',
    company: 'Monsters Inc',
    country: 'Kenya',
    contact: '+1 (555) 242-1546',
    joinedDate: '2022-08-13T00:00:00.000Z'
  },
  {
    id: 'user-044',
    name: 'Kali Tolfree',
    email: 'kali.tolfree43@example.com',
    role: 'Guest',
    plan: 'Enterprise',
    status: 'Suspended',
    billing: 'Credit Card',
    company: 'Pixar Animation',
    country: 'Colombia',
    contact: '+1 (555) 243-1559',
    joinedDate: '2023-03-27T00:00:00.000Z'
  },
  {
    id: 'user-045',
    name: 'Vito Wilmott',
    email: 'vito.wilmott44@example.com',
    role: 'Guest',
    plan: 'Enterprise',
    status: 'Suspended',
    billing: 'Credit Card',
    company: 'Cloud Nine',
    country: 'Peru',
    contact: '+1 (555) 244-1572',
    joinedDate: '2023-12-22T00:00:00.000Z'
  },
  {
    id: 'user-046',
    name: 'Jasen Bath',
    email: 'jasen.bath45@example.com',
    role: 'Guest',
    plan: 'Enterprise',
    status: 'Suspended',
    billing: 'Credit Card',
    company: 'Blue Sky Studios',
    country: 'Venezuela',
    contact: '+1 (555) 245-1585',
    joinedDate: '2024-04-05T00:00:00.000Z'
  },
  {
    id: 'user-047',
    name: 'Nickola Carillo',
    email: 'nickola.carillo46@example.com',
    role: 'Guest',
    plan: 'Enterprise',
    status: 'Suspended',
    billing: 'Credit Card',
    company: 'Red Bull GmbH',
    country: 'Pakistan',
    contact: '+1 (555) 246-1598',
    joinedDate: '2024-08-14T00:00:00.000Z'
  },
  {
    id: 'user-048',
    name: 'Erny Speers',
    email: 'erny.speers47@example.com',
    role: 'Guest',
    plan: 'Enterprise',
    status: 'Inactive',
    billing: 'Credit Card',
    company: 'Green Leaf Co',
    country: 'Bangladesh',
    contact: '+1 (555) 247-1611',
    joinedDate: '2024-12-01T00:00:00.000Z'
  },
  {
    id: 'user-049',
    name: 'Alisha McGrouther',
    email: 'alisha.mcgrouther48@example.com',
    role: 'Guest',
    plan: 'Enterprise',
    status: 'Inactive',
    billing: 'Credit Card',
    company: 'Silver Stream',
    country: 'Vietnam',
    contact: '+1 (555) 248-1624',
    joinedDate: '2025-02-28T00:00:00.000Z'
  },
  {
    id: 'user-050',
    name: 'Cristin Fell',
    email: 'cristin.fell49@example.com',
    role: 'Guest',
    plan: 'Enterprise',
    status: 'Inactive',
    billing: 'Credit Card',
    company: 'Golden Gate Ltd',
    country: 'Taiwan',
    contact: '+1 (555) 249-1637',
    joinedDate: '2025-06-01T00:00:00.000Z'
  }
]
