import type { UserProfilePageData } from '@/types/pages/user-profile-types'

export const db: UserProfilePageData = {
  // About Section - Profile Section Data
  profileSections: [
    {
      title: 'About',
      items: [
        { iconKey: 'UserIcon', label: 'Full Name', value: 'John Doe' },
        { iconKey: 'CheckCheckIcon', label: 'Status', value: 'Active' },
        { iconKey: 'StarIcon', label: 'Role', value: 'Developer' },
        { iconKey: 'FlagIcon', label: 'Country', value: 'USA' },
        { iconKey: 'LanguagesIcon', label: 'Languages', value: 'English' }
      ]
    },
    {
      title: 'Contacts',
      items: [
        { iconKey: 'PhoneIcon', label: 'Contact', value: '(123) 456-7890' },
        { iconKey: 'MessagesSquareIcon', label: 'Skype', value: 'John.doe' },
        { iconKey: 'MailIcon', label: 'Email', value: 'john.doe@example.com' }
      ]
    },
    {
      title: 'Teams',
      items: [
        { label: 'Backend Developer', value: '(126 Members)' },
        { label: 'React Developer', value: '(34 Members)' }
      ]
    }
  ],
  overviewSections: [
    {
      title: 'Overview',
      items: [
        { iconKey: 'CheckIcon', label: 'Task Compiled', value: '13.5k' },
        { iconKey: 'UserIcon', label: 'Connections', value: '897' },
        { iconKey: 'LayoutGridIcon', label: 'Projects Compiled', value: '146' }
      ]
    }
  ],

  // Activity Timeline - Profile Section Data
  activityLog: [
    {
      id: 1,
      description: '12 Invoices have been paid',
      timestamp: '12 min ago',
      detail: 'Invoices have been paid to the company.',
      attachment: {
        name: 'invoice.pdf',
        fileType: 'pdf'
      }
    },
    {
      id: 2,
      description: 'Client Meeting',
      timestamp: '45 min ago',
      detail: 'Project meeting with john @10:15am',
      person: {
        name: 'Lester McCarthy (Client)',
        initials: 'LM',
        role: 'CEO of ThemeSelection',
        avatar: '/images/avatars/avatar-3.webp'
      }
    },
    {
      id: 3,
      description: 'Create a new project for client',
      timestamp: '2 Day Ago',
      detail: '6 team members in a project',
      teamMembers: [
        {
          name: 'Alex Carter',
          initials: 'AC',
          avatar: '/images/avatars/avatar-1.webp'
        },
        {
          name: 'Mia Stewart',
          initials: 'MS',
          avatar: '/images/avatars/avatar-2.webp'
        },
        {
          name: 'Noah Wilson',
          initials: 'NW',
          avatar: '/images/avatars/avatar-4.webp'
        }
      ],
      teamExtraCount: 3
    }
  ],

  // Project - Profile Section Data
  projectDatatable: [
    {
      id: 'upp-001',
      name: 'Atlas CRM Revamp',
      type: 'Figma Project',
      logo: '/images/brands/figma-icon.webp',
      logoDark: '/images/brands/figma-icon.webp',
      leader: 'Olivia Reed',
      team: [
        { avatar: '/images/avatars/avatar-1.webp', initials: 'OR' },
        { avatar: '/images/avatars/avatar-3.webp', initials: 'JD' }
      ],
      teamExtraCount: 2,
      progress: 82,
      updatedAt: 'Updated 2 days ago'
    },
    {
      id: 'upp-002',
      name: 'Nimbus Analytics Portal',
      type: 'Next Project',
      logo: '/images/brands/next-logo.webp',
      logoDark: '/images/brands/next-logo-dark.webp',
      leader: 'Liam Cooper',
      team: [
        { avatar: '/images/avatars/avatar-2.webp', initials: 'LC' },
        { avatar: '/images/avatars/avatar-4.webp', initials: 'MP' }
      ],
      teamExtraCount: 1,
      progress: 64,
      updatedAt: 'Updated 5 days ago'
    },
    {
      id: 'upp-003',
      name: 'Shadcn UI Admin Dashboard',
      type: 'Shadcn Project',
      logo: '/images/brands/shadcn-logo.webp',
      logoDark: '/images/brands/shadcn-logo.webp',
      leader: 'Sophia Patel',
      team: [{ avatar: '/images/avatars/avatar-5.webp', initials: 'SP' }, { initials: 'AL' }],
      teamExtraCount: 3,
      progress: 47,
      updatedAt: 'Updated 1 day ago'
    },
    {
      id: 'upp-004',
      name: 'Vertex System',
      type: 'Laravel Project',
      logo: '/images/brands/laravel-logo.webp',
      logoDark: '/images/brands/laravel-logo.webp',
      leader: 'Noah Bennett',
      team: [
        { avatar: '/images/avatars/avatar-7.webp', initials: 'NB' },
        { avatar: '/images/avatars/avatar-8.webp', initials: 'EA' },
        { initials: 'RB' }
      ],
      teamExtraCount: 2,
      progress: 91,
      updatedAt: 'Updated 3 days ago'
    },
    {
      id: 'upp-005',
      name: 'Pulse API Gateway',
      type: 'MCP Project',
      logo: '/images/brands/mcp-icon.webp',
      logoDark: '/images/brands/mcp-icon-dark.webp',
      leader: 'Ava Collins',
      team: [
        { avatar: '/images/avatars/avatar-9.webp', initials: 'AC' },
        { avatar: '/images/avatars/avatar-10.webp', initials: 'DN' }
      ],
      teamExtraCount: 1,
      progress: 58,
      updatedAt: 'Updated 6 days ago'
    },
    {
      id: 'upp-006',
      name: 'eCommerce Website',
      type: 'React Project',
      logo: '/images/brands/react-logo.webp',
      logoDark: '/images/brands/react-logo.webp',
      leader: 'Ethan Miles',
      team: [
        { avatar: '/images/avatars/avatar-11.webp', initials: 'EM' },
        { avatar: '/images/avatars/avatar-12.webp', initials: 'HS' }
      ],
      teamExtraCount: 4,
      progress: 36,
      updatedAt: 'Updated 4 days ago'
    },
    {
      id: 'upp-007',
      name: 'Mercury Billing Engine',
      type: 'MCP Project',
      logo: '/images/brands/mcp-icon.webp',
      logoDark: '/images/brands/mcp-icon-dark.webp',
      leader: 'Mia Turner',
      team: [
        { avatar: '/images/avatars/avatar-1.webp', initials: 'MT' },
        { avatar: '/images/avatars/avatar-6.webp', initials: 'CK' },
        { initials: 'FG' }
      ],
      teamExtraCount: 0,
      progress: 73,
      updatedAt: 'Updated 7 days ago'
    },
    {
      id: 'upp-008',
      name: 'Quasar Support Desk',
      type: 'Next Project',
      logo: '/images/brands/next-logo.webp',
      logoDark: '/images/brands/next-logo-dark.webp',
      leader: 'Jacob Lee',
      team: [
        { avatar: '/images/avatars/avatar-3.webp', initials: 'JL' },
        { avatar: '/images/avatars/avatar-8.webp', initials: 'RW' },
        { initials: 'NH' }
      ],
      teamExtraCount: 0,
      progress: 69,
      updatedAt: 'Updated 8 days ago'
    },
    {
      id: 'upp-009',
      name: 'Beacon Knowledge Base',
      type: 'Nuxt Project',
      logo: '/images/brands/github-icon.webp',
      logoDark: '/images/brands/github-white.webp',
      leader: 'Isabella Gray',
      team: [
        { avatar: '/images/avatars/avatar-4.webp', initials: 'IG' },
        { avatar: '/images/avatars/avatar-9.webp', initials: 'PS' }
      ],
      teamExtraCount: 3,
      progress: 54,
      updatedAt: 'Updated 10 days ago'
    },
    {
      id: 'upp-010',
      name: 'Figma Design System',
      type: 'UI Project',
      logo: '/images/brands/figma-icon.webp',
      logoDark: '/images/brands/figma-icon.webp',
      leader: 'Henry Foster',
      team: [
        { avatar: '/images/avatars/avatar-2.webp', initials: 'HF' },
        { avatar: '/images/avatars/avatar-5.webp', initials: 'KT' },
        { initials: 'UE' }
      ],
      teamExtraCount: 2,
      progress: 88,
      updatedAt: 'Updated 12 days ago'
    }
  ],

  // Connections - Profile Section Data
  connectionActions: ['Share', 'Suggest Edits', 'Report Bug'],
  connections: [
    {
      id: 1,
      name: 'Cecilia Payne',
      initials: 'CP',
      avatar: '/images/avatars/avatar-1.webp',
      totalConnections: '45 Connections',
      isConnected: false
    },
    {
      id: 2,
      name: 'Curtis Fletcher',
      initials: 'CF',
      avatar: '/images/avatars/avatar-2.webp',
      totalConnections: '1.32k Connections',
      isConnected: true
    },
    {
      id: 3,
      name: 'Alice Stone',
      initials: 'AS',
      avatar: '/images/avatars/avatar-3.webp',
      totalConnections: '125 Connections',
      isConnected: true
    },
    {
      id: 4,
      name: 'Darrell Barnes',
      initials: 'DB',
      avatar: '/images/avatars/avatar-4.webp',
      totalConnections: '456 Connections',
      isConnected: false
    },
    {
      id: 5,
      name: 'Eugenia Moore',
      initials: 'EM',
      avatar: '/images/avatars/avatar-5.webp',
      totalConnections: '1.2k Connections',
      isConnected: false
    }
  ],

  // Connections Card - Connection Section Data
  connectionCardActions: ['Share Connection', 'Block Connection', 'Delete'],
  connectionCards: [
    {
      id: 1,
      name: 'Mark Gilbert',
      role: 'UI Designer',
      initials: 'MG',
      avatar: '/images/avatars/avatar-1.webp',
      tags: [{ label: 'Figma' }, { label: 'Sketch' }],
      stats: {
        projects: '18',
        tasks: '834',
        connections: '129'
      },
      totalConnections: '129 Connections',
      isConnected: true
    },
    {
      id: 2,
      name: 'Eugenia Parsons',
      role: 'Developer',
      initials: 'EP',
      avatar: '/images/avatars/avatar-2.webp',
      tags: [{ label: 'Angular' }, { label: 'React' }],
      stats: {
        projects: '112',
        tasks: '2.31k',
        connections: '1.28k'
      },
      totalConnections: '1.28k Connections',
      isConnected: false
    },
    {
      id: 3,
      name: 'Francis Byrd',
      role: 'Developer',
      initials: 'FB',
      avatar: '/images/avatars/avatar-3.webp',
      tags: [{ label: 'HTML' }, { label: 'React' }],
      stats: {
        projects: '32',
        tasks: '1.25k',
        connections: '890'
      },
      totalConnections: '890 Connections',
      isConnected: false
    },
    {
      id: 4,
      name: 'Leon Lucas',
      role: 'UI/UX Designer',
      initials: 'LL',
      avatar: '/images/avatars/avatar-4.webp',
      tags: [{ label: 'Figma' }, { label: 'Sketch' }, { label: 'Photoshop' }],
      stats: {
        projects: '86',
        tasks: '12.4k',
        connections: '890'
      },
      totalConnections: '890 Connections',
      isConnected: false
    },
    {
      id: 5,
      name: 'Jayden Rogers',
      role: 'Full Stack Developer',
      initials: 'JR',
      avatar: '/images/avatars/avatar-5.webp',
      tags: [{ label: 'React' }, { label: 'HTML' }, { label: 'Node.js' }],
      stats: {
        projects: '244',
        tasks: '23.8k',
        connections: '2.14k'
      },
      totalConnections: '2.14k Connections',
      isConnected: true
    },
    {
      id: 6,
      name: 'Jeanette Powell',
      role: 'SEO',
      initials: 'JP',
      avatar: '/images/avatars/avatar-6.webp',
      tags: [{ label: 'Analysis' }, { label: 'Writing' }],
      stats: {
        projects: '32',
        tasks: '1.28k',
        connections: '1.27k'
      },
      totalConnections: '1.27k Connections',
      isConnected: false
    }
  ],

  // Team - Profile Section Data
  teamActions: ['Share Teams', 'Suggest Edits', 'Report Bug'],
  teams: [
    {
      id: 1,
      teams: 'React Developers',
      initials: 'RD',
      avatar: '/images/avatars/avatar-1.webp',
      totalMembers: '72 Members',
      teamBadge: {
        label: 'Developer'
      }
    },
    {
      id: 2,
      teams: 'Vue Developers',
      initials: 'VD',
      avatar: '/images/avatars/avatar-2.webp',
      totalMembers: '58 Members',
      teamBadge: {
        label: 'Developer'
      }
    },
    {
      id: 3,
      teams: 'Angular Developers',
      initials: 'AD',
      avatar: '/images/avatars/avatar-3.webp',
      totalMembers: '65 Members',
      teamBadge: {
        label: 'Developer'
      }
    },
    {
      id: 4,
      teams: 'UI Designers',
      initials: 'UD',
      avatar: '/images/avatars/avatar-4.webp',
      totalMembers: '72 Members',
      teamBadge: {
        label: 'Designer'
      }
    },
    {
      id: 5,
      teams: 'Digital Marketing',
      initials: 'DM',
      avatar: '/images/avatars/avatar-2.webp',
      totalMembers: '58 Members',
      teamBadge: {
        label: 'Marketing'
      }
    }
  ]
}
