import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink } from 'better-auth/plugins'
import { Resend } from 'resend'
import { db } from './db/client.js'
import * as schema from './db/schema.js'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'Cricket Live <noreply@cricketlive.com>'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await resend.emails.send({
        from: FROM,
        to: user.email,
        subject: 'Verify your Cricket Live account',
        html: `<p>Hi ${user.name ?? user.email},</p><p>Click <a href="${url}">here</a> to verify your email address. This link expires in 1 hour.</p>`,
      })
    },
    autoSignInAfterVerification: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await resend.emails.send({
          from: FROM,
          to: email,
          subject: 'Your Cricket Live sign-in link',
          html: `<p>Click <a href="${url}">here</a> to sign in to Cricket Live. This link expires in 5 minutes.</p>`,
        })
      },
    }),
  ],
  trustedOrigins: ['http://localhost:5173'],
})

export type Auth = typeof auth
