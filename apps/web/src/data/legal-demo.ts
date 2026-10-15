export type LegalRecord = {
  cells: string[]
  status: string
}

export type LegalResource = {
  title: string
  description: string
  columns: string[]
  records: LegalRecord[]
}

export const legalResources: Record<string, LegalResource> = {
  matters: {
    title: 'Matters & Cases',
    description: 'A working view of active matters, ownership, and upcoming milestones.',
    columns: ['Matter', 'Client', 'Practice area', 'Lead counsel', 'Next milestone'],
    records: [
      { cells: ['JM-2026-0142 · Northstar acquisition', 'Northstar Holdings', 'Corporate', 'Jordan Ellis', 'Oct 19, 2026'], status: 'Active' },
      { cells: ['JM-2026-0138 · Meridian lease', 'Meridian Health Group', 'Real estate', 'Maya Chen', 'Oct 20, 2026'], status: 'Hearing' },
      { cells: ['JM-2026-0127 · Alder employment review', 'Alder & Finch', 'Employment', 'Omar Rahman', 'Oct 22, 2026'], status: 'Active' },
      { cells: ['JM-2026-0119 · Harborline dispute', 'Harborline Logistics', 'Litigation', 'Maya Chen', 'Oct 26, 2026'], status: 'At risk' },
      { cells: ['JM-2026-0104 · Crestview financing', 'Crestview Energy', 'Finance', 'Jordan Ellis', 'Oct 29, 2026'], status: 'Active' }
    ]
  },
  clients: {
    title: 'Clients',
    description: 'Sample client directory and relationship activity for this workspace preview.',
    columns: ['Client', 'Primary contact', 'Open matters', 'Relationship lead', 'Last contact'],
    records: [
      { cells: ['Northstar Holdings', 'Priya Shah', '3', 'Jordan Ellis', 'Oct 13, 2026'], status: 'Active' },
      { cells: ['Meridian Health Group', 'Evan Brooks', '2', 'Maya Chen', 'Oct 12, 2026'], status: 'Active' },
      { cells: ['Alder & Finch', 'Morgan Lee', '1', 'Omar Rahman', 'Oct 10, 2026'], status: 'Active' },
      { cells: ['Harborline Logistics', 'Tariq Ahmed', '2', 'Maya Chen', 'Oct 8, 2026'], status: 'Review due' },
      { cells: ['Crestview Energy', 'Dana Cole', '4', 'Jordan Ellis', 'Oct 7, 2026'], status: 'Active' }
    ]
  },
  staff: {
    title: 'Lawyers & Staff',
    description: 'Sample firm roster and practice responsibilities.',
    columns: ['Team member', 'Role', 'Practice group', 'Open matters', 'Availability'],
    records: [
      { cells: ['Jordan Ellis', 'Partner', 'Corporate', '18', 'Available'], status: 'Active' },
      { cells: ['Maya Chen', 'Partner', 'Litigation', '22', 'In court'], status: 'Active' },
      { cells: ['Omar Rahman', 'Associate', 'Employment', '14', 'Available'], status: 'Active' },
      { cells: ['Riley Carter', 'Paralegal', 'Litigation', '9', 'Available'], status: 'Active' },
      { cells: ['Avery Patel', 'Legal assistant', 'Corporate', '7', 'On leave'], status: 'Pending' }
    ]
  },
  tasks: {
    title: 'Tasks & Deadlines',
    description: 'Sample assignments and due dates. No reminders or calendar sync are active.',
    columns: ['Task', 'Matter', 'Assignee', 'Due date', 'Priority'],
    records: [
      { cells: ['Review draft purchase agreement', 'Northstar acquisition', 'Jordan Ellis', 'Oct 16, 2026', 'High'], status: 'In progress' },
      { cells: ['Prepare hearing bundle', 'Meridian lease', 'Maya Chen', 'Oct 17, 2026', 'High'], status: 'Open' },
      { cells: ['Collect witness statements', 'Harborline dispute', 'Omar Rahman', 'Oct 19, 2026', 'Medium'], status: 'Open' },
      { cells: ['File board resolutions', 'Crestview financing', 'Jordan Ellis', 'Oct 20, 2026', 'Medium'], status: 'Review' }
    ]
  },
  documents: {
    title: 'Documents',
    description: 'Sample document index only. Files are not stored or available for download.',
    columns: ['Document', 'Matter', 'Type', 'Owner', 'Updated'],
    records: [
      { cells: ['Asset purchase agreement · v3', 'Northstar acquisition', 'Contract', 'Jordan Ellis', 'Oct 14, 2026'], status: 'Draft' },
      { cells: ['Lease amendment · hearing bundle', 'Meridian lease', 'Court filing', 'Maya Chen', 'Oct 13, 2026'], status: 'Review' },
      { cells: ['Initial case assessment', 'Harborline dispute', 'Memo', 'Omar Rahman', 'Oct 10, 2026'], status: 'Approved' },
      { cells: ['Credit facility checklist', 'Crestview financing', 'Checklist', 'Jordan Ellis', 'Oct 9, 2026'], status: 'In progress' }
    ]
  },
  communications: {
    title: 'Communications',
    description: 'Sample matter-related communication history. No email or messaging service is connected.',
    columns: ['Subject', 'Client / matter', 'From', 'Received', 'Channel'],
    records: [
      { cells: ['Revised term sheet and open points', 'Northstar acquisition', 'Priya Shah', 'Oct 14, 2026', 'Email'], status: 'Review' },
      { cells: ['Hearing attendance and exhibits', 'Meridian lease', 'Evan Brooks', 'Oct 13, 2026', 'Email'], status: 'Active' },
      { cells: ['Witness availability for deposition', 'Harborline dispute', 'Tariq Ahmed', 'Oct 12, 2026', 'Email'], status: 'Active' },
      { cells: ['Signature packet delivery', 'Crestview financing', 'Dana Cole', 'Oct 11, 2026', 'Portal'], status: 'Sent' }
    ]
  },
  time: {
    title: 'Time Tracking',
    description: 'Illustrative time entries for practice-management planning.',
    columns: ['Date', 'Matter', 'Timekeeper', 'Work description', 'Hours'],
    records: [
      { cells: ['Oct 14, 2026', 'Northstar acquisition', 'Jordan Ellis', 'Review and revise purchase agreement', '2.4'], status: 'Unbilled' },
      { cells: ['Oct 14, 2026', 'Meridian lease', 'Maya Chen', 'Hearing preparation', '1.6'], status: 'Unbilled' },
      { cells: ['Oct 13, 2026', 'Harborline dispute', 'Omar Rahman', 'Client conference and follow-up', '1.2'], status: 'Submitted' },
      { cells: ['Oct 13, 2026', 'Crestview financing', 'Jordan Ellis', 'Review lender comments', '0.8'], status: 'Approved' }
    ]
  },
  billing: {
    title: 'Billing & Invoices',
    description: 'Example invoice status and balances. No billing data is connected.',
    columns: ['Invoice', 'Client', 'Matter', 'Issued', 'Amount'],
    records: [
      { cells: ['INV-2026-108', 'Northstar Holdings', 'Northstar acquisition', 'Oct 1, 2026', '$8,450'], status: 'Sent' },
      { cells: ['INV-2026-104', 'Meridian Health Group', 'Meridian lease', 'Sep 28, 2026', '$4,200'], status: 'Paid' },
      { cells: ['INV-2026-099', 'Harborline Logistics', 'Harborline dispute', 'Sep 18, 2026', '$6,780'], status: 'Overdue' },
      { cells: ['INV-2026-091', 'Crestview Energy', 'Crestview financing', 'Sep 12, 2026', '$3,950'], status: 'Paid' }
    ]
  },
  reports: {
    title: 'Reports',
    description: 'An overview of sample operational reports available in this concept.',
    columns: ['Report', 'Period', 'Prepared for', 'Last updated', 'Coverage'],
    records: [
      { cells: ['Matter portfolio', 'Q4 2026', 'Firm leadership', 'Oct 14, 2026', 'All practice areas'], status: 'Ready' },
      { cells: ['Deadline outlook', 'Next 30 days', 'Practice leads', 'Oct 14, 2026', 'Open matters'], status: 'Ready' },
      { cells: ['Timekeeper utilization', 'Sep 2026', 'Firm leadership', 'Oct 3, 2026', 'Sample entries'], status: 'Sample' },
      { cells: ['Client activity', 'Q3 2026', 'Relationship leads', 'Oct 1, 2026', 'Sample contacts'], status: 'Sample' }
    ]
  },
  'administration-users': {
    title: 'Users & Roles',
    description: 'Sample access roster. Role assignments and permissions are not enforced yet.',
    columns: ['Team member', 'Email', 'Role', 'Last active', 'Access state'],
    records: [
      { cells: ['Jordan Ellis', 'jordan.ellis@example.com', 'Firm administrator', 'Just now', 'Invited'], status: 'Demo' },
      { cells: ['Maya Chen', 'maya.chen@example.com', 'Partner', 'Today', 'Invited'], status: 'Demo' },
      { cells: ['Omar Rahman', 'omar.rahman@example.com', 'Associate', 'Yesterday', 'Invited'], status: 'Demo' },
      { cells: ['Riley Carter', 'riley.carter@example.com', 'Paralegal', 'Oct 12, 2026', 'Invited'], status: 'Demo' }
    ]
  },
  'audit-logs': {
    title: 'Audit Logs',
    description: 'Illustrative audit entries. This page does not record real security events.',
    columns: ['Time', 'Actor', 'Activity', 'Record', 'Source'],
    records: [
      { cells: ['Oct 14, 2026 · 10:42', 'Jordan Ellis', 'Updated matter milestone', 'JM-2026-0142', 'Workspace preview'], status: 'Sample' },
      { cells: ['Oct 14, 2026 · 09:18', 'Maya Chen', 'Added hearing note', 'JM-2026-0138', 'Workspace preview'], status: 'Sample' },
      { cells: ['Oct 13, 2026 · 16:05', 'Omar Rahman', 'Uploaded case assessment', 'JM-2026-0119', 'Workspace preview'], status: 'Sample' },
      { cells: ['Oct 13, 2026 · 11:27', 'Jordan Ellis', 'Added team member', 'Riley Carter', 'Workspace preview'], status: 'Sample' }
    ]
  }
}

export const upcomingEvents = [
  { date: 'OCT 16', time: '9:30 AM', title: 'Deposition preparation', matter: 'Harborline dispute', type: 'Deadline' },
  { date: 'OCT 19', time: '10:00 AM', title: 'Case management hearing', matter: 'Meridian lease', type: 'Hearing' },
  { date: 'OCT 21', time: '2:00 PM', title: 'Client strategy meeting', matter: 'Northstar acquisition', type: 'Meeting' }
]

export const recentMatters = [
  { reference: 'JM-2026-0142', matter: 'Northstar acquisition', client: 'Northstar Holdings', owner: 'Jordan Ellis', status: 'Active' },
  { reference: 'JM-2026-0138', matter: 'Meridian lease', client: 'Meridian Health Group', owner: 'Maya Chen', status: 'Hearing' },
  { reference: 'JM-2026-0127', matter: 'Alder employment review', client: 'Alder & Finch', owner: 'Omar Rahman', status: 'Active' },
  { reference: 'JM-2026-0119', matter: 'Harborline dispute', client: 'Harborline Logistics', owner: 'Maya Chen', status: 'At risk' }
]
