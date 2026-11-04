import { z } from 'zod'

export const issueReportSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  phone: z
    .string()
    .min(1, 'Phone is required')
    .regex(/^\+?[0-9()\-\s]{8,20}$/, 'Please enter a valid phone number.'),
  company: z.string().min(2, 'Company name must be at least 2 characters.'),
  email: z.string().min(1, 'Email is required').email({ message: 'Please enter a valid email address.' }),
  orderId: z.string().min(3, 'Order ID is required.'),
  issue: z.string().min(1, { message: 'Kindly select an issue.' }),
  department: z.string().min(1, { message: 'Kindly select a department.' }),
  priority: z.string().min(1, { message: 'Kindly select a priority.' }),
  selectedOption: z.enum(['replace', 'refund', 'support'], {
    error: 'Selection of an option is required.',
  }),
  message: z.string().min(50, 'Describe your issue using at least 50 characters.'),
})

export type IssueReportFormValues = z.infer<typeof issueReportSchema>
