import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(320, 'Email address is too long.'),
  password: z.string().min(1, 'Enter your password.').max(1024, 'Password is too long.'),
})

export const individualPracticeSchema = z.object({
  name: z.string().trim().min(1, 'Enter a workspace name.').max(200, 'Use 200 characters or fewer.'),
})

const accountRegistration = z.object({
  fullName: z.string().trim().min(1, 'Enter your name.').max(200, 'Use 200 characters or fewer.'),
  email: z.string().trim().email('Enter a valid email address.').max(320, 'Email address is too long.'),
  password: z.string().min(12, 'Use at least 12 characters.').max(256, 'Use 256 characters or fewer.'),
})

export const firmRegistrationSchema = accountRegistration.extend({
  firmName: z.string().trim().min(1, 'Enter your firm name.').max(200, 'Use 200 characters or fewer.'),
})

export const lawyerRegistrationSchema = accountRegistration
