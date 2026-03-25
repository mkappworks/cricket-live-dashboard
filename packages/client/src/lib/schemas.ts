import { z } from 'zod'

export const signInSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export const signUpSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Min 8 characters'),
})

export const magicLinkSchema = z.object({
  email: z.string().email('Enter a valid email'),
})

export const matchNameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Max 100 characters'),
})

export const inviteEmailSchema = z.object({
  email: z.string().email('Enter a valid email'),
})
