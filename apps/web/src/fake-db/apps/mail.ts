// Third-party Imports
import { subDays, subHours, subWeeks } from 'date-fns'

// Type Imports
import type { Email } from '@/types/apps/mail-types'

// Config Imports
import { MAIL_CURRENT_USER } from '@/configs/mailConfig'

const now = new Date()
const hoursAgo = (hours: number) => subHours(now, hours)
const daysAgo = (days: number) => subDays(now, days)
const weeksAgo = (weeks: number) => subWeeks(now, weeks)

export const db: Email[] = [
  {
    id: '1',
    from: 'Sarah Johnson',
    fromEmail: 'sarah.johnson@example.com',
    avatar: '/images/avatars/avatar-3.webp?seed=Sarah',
    subject: 'Q4 Marketing Campaign Review',
    preview: "Thanks for the feedback — I'll incorporate your suggestions into the Q1 plan.",
    body: "Thanks for the feedback — I'll incorporate your suggestions into the Q1 plan.\n\nLet's sync on Monday to finalize the deck.\n\nBest,\nSarah",
    date: hoursAgo(2),
    isRead: true,
    isStarred: false,
    labels: ['updates'],
    status: 'inbox',
    thread: {
      messages: [
        {
          id: '1-1',
          from: 'Sarah Johnson',
          fromEmail: 'sarah.johnson@example.com',
          body: "Hi team,\n\nI wanted to share the latest metrics from our Q4 campaign. We've seen a 35% increase in engagement compared to Q3, which is fantastic news!\n\nKey highlights:\n- Email open rate: 42%\n- Click-through rate: 18%\n- Conversion rate: 8.5%\n\nLet's schedule a meeting next week to discuss the strategy for Q1.\n\nBest regards,\nSarah",
          date: daysAgo(3)
        },
        {
          id: '1-2',
          from: MAIL_CURRENT_USER.name,
          fromEmail: MAIL_CURRENT_USER.email,
          body: "Hi Sarah,\n\nGreat numbers! The conversion rate improvement is especially impressive.\n\nI'd suggest we double down on the email campaigns that performed best in Q4. Can you share the top-performing subject lines?\n\nThanks,\nYou",
          date: daysAgo(2),
          isFromMe: true
        },
        {
          id: '1-3',
          from: 'Sarah Johnson',
          fromEmail: 'sarah.johnson@example.com',
          body: 'Absolutely! Here are the top 3 subject lines:\n\n1. "Your exclusive Q4 offer inside" — 48% open rate\n2. "Last chance: 30% off ends Friday" — 45% open rate\n3. "We miss you — here\'s 20% off" — 41% open rate\n\nI\'ll prepare a detailed breakdown for our Monday meeting.\n\nSarah',
          date: daysAgo(1)
        },
        {
          id: '1-4',
          from: 'Sarah Johnson',
          fromEmail: 'sarah.johnson@example.com',
          body: "Thanks for the feedback — I'll incorporate your suggestions into the Q1 plan.\n\nLet's sync on Monday to finalize the deck.\n\nBest,\nSarah",
          date: hoursAgo(2)
        }
      ]
    }
  },
  {
    id: '2',
    from: 'Michael Chen',
    fromEmail: 'michael.chen@example.com',
    avatar: '/images/avatars/avatar-4.webp?seed=Michael',
    subject: 'Project Timeline Update',
    preview: 'Hello, Just a quick update on the timeline for the new dashboard...',
    body: "Hello,\n\nJust a quick update on the timeline for the new dashboard project. We're currently on track to complete Phase 1 by the end of this month.\n\nNext steps:\n1. Complete UI design review\n2. Backend API integration\n3. Testing and QA\n\nPlease let me know if you have any concerns.\n\nThanks,\nMichael",
    date: hoursAgo(5),
    isRead: true,
    isStarred: true,
    labels: ['updates'],
    status: 'inbox',
    thread: {
      messages: [
        {
          id: '2-1',
          from: 'Michael Chen',
          fromEmail: 'michael.chen@example.com',
          body: "Hello,\n\nJust a quick update on the timeline for the new dashboard project. We're currently on track to complete Phase 1 by the end of this month.\n\nNext steps:\n1. Complete UI design review\n2. Backend API integration\n3. Testing and QA\n\nPlease let me know if you have any concerns.\n\nThanks,\nMichael",
          date: hoursAgo(5)
        }
      ]
    }
  },
  {
    id: '3',
    from: 'Emma Wilson',
    fromEmail: 'emma.wilson@example.com',
    avatar: '/images/avatars/avatar-6.webp?seed=Emma',
    subject: 'Re: Team Lunch Tomorrow',
    preview: 'Perfect — see you at 12:30 at the usual spot!',
    body: 'Perfect — see you at 12:30 at the usual spot!\n\nEmma',
    date: daysAgo(1),
    isRead: false,
    isStarred: false,
    labels: ['social'],
    status: 'inbox',
    thread: {
      messages: [
        {
          id: '3-1',
          from: 'David Park',
          fromEmail: 'david.park@example.com',
          body: "Hey everyone,\n\nWho's up for team lunch tomorrow? I was thinking we could try that new Thai place on Main Street.\n\nLet me know!\nDavid",
          date: daysAgo(2)
        },
        {
          id: '3-2',
          from: 'Emma Wilson',
          fromEmail: 'emma.wilson@example.com',
          body: "Count me in! What time are we meeting?\n\nI'm flexible after 12:30 PM. Looking forward to it!\n\nEmma",
          date: daysAgo(1)
        },
        {
          id: '3-3',
          from: 'Emma Wilson',
          fromEmail: 'emma.wilson@example.com',
          body: 'Perfect — see you at 12:30 at the usual spot!\n\nEmma',
          date: daysAgo(1)
        }
      ]
    }
  },
  {
    id: '4',
    from: 'David Park',
    fromEmail: 'david.park@example.com',
    subject: 'Code Review Request',
    preview: 'Hi, Could you review my PR for the authentication module?',
    body: "Hi,\n\nCould you review my PR for the authentication module? I've implemented the OAuth2 flow and added unit tests.\n\nPR link: github.com/company/project/pull/234\n\nThanks!\nDavid",
    date: daysAgo(1),
    isRead: false,
    isStarred: false,
    labels: ['forums'],
    status: 'inbox',
    thread: {
      messages: [
        {
          id: '4-1',
          from: 'David Park',
          fromEmail: 'david.park@example.com',
          body: "Hi,\n\nCould you review my PR for the authentication module? I've implemented the OAuth2 flow and added unit tests.\n\nPR link: github.com/company/project/pull/234\n\nThanks!\nDavid",
          date: daysAgo(1)
        }
      ]
    }
  },
  {
    id: '5',
    from: MAIL_CURRENT_USER.name,
    fromEmail: MAIL_CURRENT_USER.email,
    to: 'Product Team',
    toEmail: 'product@example.com',
    subject: 'Meeting Notes - Product Sync',
    preview: "Here are the notes from today's product sync meeting...",
    body: "Here are the notes from today's product sync meeting:\n\n- Discussed new feature priorities\n- Agreed on sprint goals\n- Next meeting: Friday 2 PM\n\nAction items:\n- Review design mockups\n- Update JIRA tickets\n\nBest,\nYou",
    date: daysAgo(2),
    isRead: true,
    isStarred: true,
    labels: [],
    status: 'sent',
    thread: {
      messages: [
        {
          id: '5-1',
          from: MAIL_CURRENT_USER.name,
          fromEmail: MAIL_CURRENT_USER.email,
          body: "Here are the notes from today's product sync meeting:\n\n- Discussed new feature priorities\n- Agreed on sprint goals\n- Next meeting: Friday 2 PM\n\nAction items:\n- Review design mockups\n- Update JIRA tickets\n\nBest,\nYou",
          date: daysAgo(2),
          isFromMe: true
        }
      ]
    }
  },
  {
    id: '6',
    from: 'Jessica Martinez',
    fromEmail: 'jessica.martinez@example.com',
    subject: 'Budget Approval Request',
    preview: 'Hi, I need approval for the additional budget for Q1 marketing...',
    body: 'Hi,\n\nI need approval for the additional budget for Q1 marketing initiatives. The projected ROI is 3.5x based on our Q4 performance.\n\nDetailed breakdown:\n- Social media ads: $15,000\n- Content creation: $8,000\n- Email campaigns: $5,000\n\nTotal: $28,000\n\nPlease review the attached proposal and let me know if you have any questions.\n\nBest regards,\nJessica',
    date: daysAgo(3),
    isRead: true,
    isStarred: true,
    labels: ['updates'],
    status: 'inbox',
    thread: {
      messages: [
        {
          id: '6-1',
          from: 'Jessica Martinez',
          fromEmail: 'jessica.martinez@example.com',
          body: 'Hi,\n\nI need approval for the additional budget for Q1 marketing initiatives. The projected ROI is 3.5x based on our Q4 performance.\n\nDetailed breakdown:\n- Social media ads: $15,000\n- Content creation: $8,000\n- Email campaigns: $5,000\n\nTotal: $28,000\n\nPlease review the attached proposal and let me know if you have any questions.\n\nBest regards,\nJessica',
          date: daysAgo(3)
        }
      ]
    }
  },
  {
    id: '7',
    from: 'Alex Thompson',
    fromEmail: 'alex.thompson@example.com',
    avatar: '/images/avatars/avatar-7.webp?seed=Alex',
    subject: 'Server Maintenance Notice',
    preview: 'Scheduled maintenance this Saturday from 2 AM to 6 AM...',
    body: 'Scheduled maintenance this Saturday from 2 AM to 6 AM.\n\nWhat to expect:\n- Brief service interruptions\n- System upgrades\n- Security patches\n\nAll services will be fully restored by 6 AM.\n\nAlex\nIT Operations',
    date: daysAgo(4),
    isRead: true,
    isStarred: false,
    labels: ['updates'],
    status: 'archive',
    thread: {
      messages: [
        {
          id: '7-1',
          from: 'Alex Thompson',
          fromEmail: 'alex.thompson@example.com',
          body: 'Scheduled maintenance this Saturday from 2 AM to 6 AM.\n\nWhat to expect:\n- Brief service interruptions\n- System upgrades\n- Security patches\n\nAll services will be fully restored by 6 AM.\n\nAlex\nIT Operations',
          date: daysAgo(4)
        }
      ]
    }
  },
  {
    id: '8',
    from: 'Rachel Green',
    fromEmail: 'rachel.green@example.com',
    avatar: '/images/avatars/avatar-8.webp?seed=Rachel',
    subject: 'Team Building Event',
    preview: 'Excited to announce our upcoming team building event!',
    body: 'Excited to announce our upcoming team building event!\n\nDate: June 15, 2026\nTime: 10 AM - 4 PM\nLocation: Central Park\n\nActivities:\n- Team challenges\n- BBQ lunch\n- Sports activities\n\nPlease RSVP by June 8.\n\nLooking forward to seeing everyone there!\n\nRachel',
    date: weeksAgo(1),
    isRead: false,
    isStarred: false,
    labels: ['social'],
    status: 'inbox',
    thread: {
      messages: [
        {
          id: '8-1',
          from: 'Rachel Green',
          fromEmail: 'rachel.green@example.com',
          body: 'Excited to announce our upcoming team building event!\n\nDate: June 15, 2026\nTime: 10 AM - 4 PM\nLocation: Central Park\n\nActivities:\n- Team challenges\n- BBQ lunch\n- Sports activities\n\nPlease RSVP by June 8.\n\nLooking forward to seeing everyone there!\n\nRachel',
          date: weeksAgo(1)
        }
      ]
    }
  },
  {
    id: '9',
    from: MAIL_CURRENT_USER.name,
    fromEmail: MAIL_CURRENT_USER.email,
    to: 'Kevin Rodriguez',
    toEmail: 'kevin.rodriguez@example.com',
    subject: 'Performance Review Feedback',
    preview: 'Thank you for the detailed performance review...',
    body: "Thank you for the detailed performance review.\n\nI appreciate the constructive feedback and agree with the areas identified for improvement. I've already started working on developing my leadership skills and will continue to focus on cross-team collaboration.\n\nLooking forward to our quarterly check-in.\n\nBest,\nKevin",
    date: weeksAgo(1),
    isRead: true,
    isStarred: false,
    labels: [],
    status: 'sent',
    thread: {
      messages: [
        {
          id: '9-1',
          from: MAIL_CURRENT_USER.name,
          fromEmail: MAIL_CURRENT_USER.email,
          body: "Thank you for the detailed performance review.\n\nI appreciate the constructive feedback and agree with the areas identified for improvement. I've already started working on developing my leadership skills and will continue to focus on cross-team collaboration.\n\nLooking forward to our quarterly check-in.\n\nBest,\nKevin",
          date: weeksAgo(1),
          isFromMe: true
        }
      ]
    }
  },
  {
    id: '10',
    from: MAIL_CURRENT_USER.name,
    fromEmail: MAIL_CURRENT_USER.email,
    subject: 'Draft: Quarterly Report',
    preview: 'Working on the quarterly report draft...',
    body: 'Working on the quarterly report draft.\n\nWill share it with the team by end of day for feedback.\n\n[Draft incomplete - save for later]',
    date: daysAgo(2),
    isRead: true,
    isStarred: false,
    labels: [],
    status: 'drafts',
    thread: {
      messages: [
        {
          id: '10-1',
          from: MAIL_CURRENT_USER.name,
          fromEmail: MAIL_CURRENT_USER.email,
          body: 'Working on the quarterly report draft.\n\nWill share it with the team by end of day for feedback.\n\n[Draft incomplete - save for later]',
          date: daysAgo(2),
          isFromMe: true
        }
      ]
    }
  },
  {
    id: '11',
    from: 'System Administrator',
    fromEmail: 'noreply@example.com',
    avatar: '/images/avatars/avatar-10.webp?seed=System',
    subject: 'Password Reset Confirmation',
    preview: 'Your password was successfully reset...',
    body: 'Your password was successfully reset on June 1, 2026 at 3:45 PM.\n\nIf you did not make this change, please contact IT support immediately.\n\nBest regards,\nSystem Administrator',
    date: daysAgo(2),
    isRead: true,
    isStarred: false,
    labels: [],
    status: 'trash',
    thread: {
      messages: [
        {
          id: '11-1',
          from: 'System Administrator',
          fromEmail: 'noreply@example.com',
          body: 'Your password was successfully reset on June 1, 2026 at 3:45 PM.\n\nIf you did not make this change, please contact IT support immediately.\n\nBest regards,\nSystem Administrator',
          date: daysAgo(2)
        }
      ]
    }
  },
  {
    id: '12',
    from: 'Marketing Team',
    fromEmail: 'marketing@example.com',
    subject: 'Newsletter - June 2026',
    preview: 'Check out our latest company newsletter...',
    body: 'Check out our latest company newsletter!\n\nHighlights:\n- New product launch\n- Employee spotlight\n- Upcoming events\n- Industry news\n\nRead more on our internal portal.\n\nMarketing Team',
    date: weeksAgo(1),
    isRead: true,
    isStarred: false,
    labels: ['promotions'],
    status: 'archive',
    thread: {
      messages: [
        {
          id: '12-1',
          from: 'Marketing Team',
          fromEmail: 'marketing@example.com',
          body: 'Check out our latest company newsletter!\n\nHighlights:\n- New product launch\n- Employee spotlight\n- Upcoming events\n- Industry news\n\nRead more on our internal portal.\n\nMarketing Team',
          date: weeksAgo(1)
        }
      ]
    }
  },
  {
    id: '13',
    from: 'Amazon Deals',
    fromEmail: 'deals@amazon.example.com',
    avatar: '/images/avatars/avatar-11.webp?seed=Amazon',
    subject: 'Your cart is waiting — 15% off today only',
    preview: 'Items in your cart are on sale. Complete your purchase before midnight.',
    body: 'Items in your cart are on sale. Complete your purchase before midnight.\n\nFeatured deals:\n- Wireless headphones — 15% off\n- USB-C hub — 20% off\n\nShop now and save!\n\nAmazon Deals',
    date: hoursAgo(6),
    isRead: false,
    isStarred: false,
    labels: ['shopping'],
    status: 'inbox',
    thread: {
      messages: [
        {
          id: '13-1',
          from: 'Amazon Deals',
          fromEmail: 'deals@amazon.example.com',
          body: 'Items in your cart are on sale. Complete your purchase before midnight.\n\nFeatured deals:\n- Wireless headphones — 15% off\n- USB-C hub — 20% off\n\nShop now and save!\n\nAmazon Deals',
          date: hoursAgo(6)
        }
      ]
    }
  },
  {
    id: '14',
    from: 'LinkedIn',
    fromEmail: 'notifications@linkedin.example.com',
    subject: '3 people viewed your profile this week',
    preview: "See who's been looking at your profile and grow your network.",
    body: "See who's been looking at your profile and grow your network.\n\nYour profile views are up 12% this week. Connect with people in your industry to stay visible.\n\nLinkedIn",
    date: daysAgo(1),
    isRead: true,
    isStarred: false,
    labels: ['social', 'updates'],
    status: 'inbox',
    thread: {
      messages: [
        {
          id: '14-1',
          from: 'LinkedIn',
          fromEmail: 'notifications@linkedin.example.com',
          body: "See who's been looking at your profile and grow your network.\n\nYour profile views are up 12% this week. Connect with people in your industry to stay visible.\n\nLinkedIn",
          date: daysAgo(1)
        }
      ]
    }
  },
  {
    id: '15',
    from: 'Dev Community',
    fromEmail: 'digest@devcommunity.example.com',
    avatar: '/images/avatars/avatar-12.webp?seed=Dev',
    subject: 'Weekly digest: Top posts in React & Next.js',
    preview: "This week's most popular discussions from the developer community.",
    body: 'This week\'s most popular discussions from the developer community.\n\n1. "Server Components vs Client Components"\n2. "Best practices for App Router"\n3. "State management in 2026"\n\nJoin the conversation!\n\nDev Community',
    date: daysAgo(3),
    isRead: false,
    isStarred: false,
    labels: ['forums'],
    status: 'inbox',
    thread: {
      messages: [
        {
          id: '15-1',
          from: 'Dev Community',
          fromEmail: 'digest@devcommunity.example.com',
          body: 'This week\'s most popular discussions from the developer community.\n\n1. "Server Components vs Client Components"\n2. "Best practices for App Router"\n3. "State management in 2026"\n\nJoin the conversation!\n\nDev Community',
          date: daysAgo(3)
        }
      ]
    }
  },
  {
    id: '16',
    from: 'Flash Sale',
    fromEmail: 'promo@retail.example.com',
    subject: 'Summer sale: Up to 50% off sitewide',
    preview: "Don't miss our biggest sale of the season. Ends Sunday.",
    body: "Don't miss our biggest sale of the season. Ends Sunday.\n\nUse code SUMMER50 at checkout for extra savings on select items.\n\nShop the sale →\n\nFlash Sale Team",
    date: daysAgo(2),
    isRead: false,
    isStarred: false,
    labels: ['promotions'],
    status: 'inbox',
    thread: {
      messages: [
        {
          id: '16-1',
          from: 'Flash Sale',
          fromEmail: 'promo@retail.example.com',
          body: "Don't miss our biggest sale of the season. Ends Sunday.\n\nUse code SUMMER50 at checkout for extra savings on select items.\n\nShop the sale →\n\nFlash Sale Team",
          date: daysAgo(2)
        }
      ]
    }
  },
  {
    id: '17',
    from: 'Nigerian Prince',
    fromEmail: 'scam@junk.example.com',
    subject: 'URGENT: You have inherited $2,000,000',
    preview: 'Dear friend, I need your help to transfer funds...',
    body: "Dear friend, I need your help to transfer funds from my late uncle's estate. Please reply with your bank details.\n\n[This is spam]",
    date: weeksAgo(1),
    isRead: true,
    isStarred: false,
    labels: [],
    status: 'spam',
    thread: {
      messages: [
        {
          id: '17-1',
          from: 'Nigerian Prince',
          fromEmail: 'scam@junk.example.com',
          body: "Dear friend, I need your help to transfer funds from my late uncle's estate. Please reply with your bank details.\n\n[This is spam]",
          date: weeksAgo(1)
        }
      ]
    }
  },
  {
    id: '18',
    from: 'Crypto Bot',
    fromEmail: 'noreply@crypto-spam.example.com',
    subject: 'Make $10,000/day with this one trick',
    preview: "Limited time offer — act now before it's too late!",
    body: "Limited time offer — act now before it's too late!\n\n[This is spam]",
    date: daysAgo(5),
    isRead: false,
    isStarred: false,
    labels: [],
    status: 'spam',
    thread: {
      messages: [
        {
          id: '18-1',
          from: 'Crypto Bot',
          fromEmail: 'noreply@crypto-spam.example.com',
          body: "Limited time offer — act now before it's too late!\n\n[This is spam]",
          date: daysAgo(5)
        }
      ]
    }
  }
]
