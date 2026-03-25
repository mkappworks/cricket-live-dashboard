import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { authClient } from '../lib/auth-client'
import { signInSchema, signUpSchema, magicLinkSchema } from '../lib/schemas'

type Tab = 'signin' | 'signup' | 'magic'

const inputClass =
  'w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 dark:bg-white/10 dark:border-white/20 dark:text-white dark:placeholder-white/40 dark:focus:border-white/50'

function FieldError({ errors }: { errors: Array<{ message: string } | string | undefined> }) {
  const first = errors[0]
  if (!first) return null
  const msg = typeof first === 'string' ? first : first.message
  return <p className="text-sm text-red-500 dark:text-red-400 -mt-1">{msg}</p>
}

export function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('signin')
  const [authError, setAuthError] = useState('')
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [signupDone, setSignupDone] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  const signInForm = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onChange: signInSchema },
    onSubmit: async ({ value }) => {
      setAuthError('')
      setUnverifiedEmail('')
      const result = await authClient.signIn.email({ email: value.email, password: value.password })
      if (result.error) {
        const msg = result.error.message ?? 'Sign in failed'
        if (msg.toLowerCase().includes('verif')) {
          setUnverifiedEmail(value.email)
        }
        setAuthError(msg)
        return
      }
      router.navigate({ to: '/' })
    },
  })

  const signUpForm = useForm({
    defaultValues: { name: '', email: '', password: '' },
    validators: { onChange: signUpSchema },
    onSubmit: async ({ value }) => {
      setAuthError('')
      const result = await authClient.signUp.email({
        email: value.email,
        password: value.password,
        name: value.name,
      })
      if (result.error) {
        setAuthError(result.error.message ?? 'Sign up failed')
        return
      }
      setSignupDone(true)
    },
  })

  const magicForm = useForm({
    defaultValues: { email: '' },
    validators: { onChange: magicLinkSchema },
    onSubmit: async ({ value }) => {
      setAuthError('')
      const result = await authClient.signIn.magicLink({ email: value.email, callbackURL: '/' })
      if (result.error) {
        setAuthError(result.error.message ?? 'Failed to send link')
        return
      }
      setMagicSent(true)
    },
  })

  async function resendVerification() {
    setResendLoading(true)
    await authClient.sendVerificationEmail({ email: unverifiedEmail, callbackURL: '/' })
    setResendLoading(false)
    setAuthError('Verification email sent — check your inbox.')
    setUnverifiedEmail('')
  }

  function switchTab(t: Tab) {
    setTab(t)
    setAuthError('')
    setUnverifiedEmail('')
    setSignupDone(false)
    setMagicSent(false)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'signin', label: 'Sign in' },
    { id: 'signup', label: 'Sign up' },
    { id: 'magic', label: 'Magic link' },
  ]

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-73px)] px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 dark:bg-black/30 dark:border-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-sm">
          <h2 className="text-gray-900 dark:text-white text-2xl font-bold mb-6 text-center">
            Cricket Live
          </h2>

          {/* Tabs */}
          <div className="flex rounded-lg bg-gray-100 dark:bg-white/5 p-1 mb-6">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  tab === t.id
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-white/15 dark:text-white'
                    : 'text-gray-400 hover:text-gray-600 dark:text-white/50 dark:hover:text-white/80'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Sign in */}
          {tab === 'signin' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                signInForm.handleSubmit()
              }}
              className="space-y-4"
            >
              <signInForm.Field
                name="email"
                validators={{ onChange: signInSchema.shape.email }}
              >
                {(field) => (
                  <div className="space-y-1">
                    <input
                      type="email"
                      placeholder="Email"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className={inputClass}
                    />
                    <FieldError errors={field.state.meta.errors } />
                  </div>
                )}
              </signInForm.Field>
              <signInForm.Field
                name="password"
                validators={{ onChange: signInSchema.shape.password }}
              >
                {(field) => (
                  <div className="space-y-1">
                    <input
                      type="password"
                      placeholder="Password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className={inputClass}
                    />
                    <FieldError errors={field.state.meta.errors } />
                  </div>
                )}
              </signInForm.Field>

              {authError && (
                <div className="space-y-2">
                  <p className="text-sm text-red-500 dark:text-red-400">{authError}</p>
                  {unverifiedEmail && (
                    <button
                      type="button"
                      onClick={resendVerification}
                      disabled={resendLoading}
                      className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
                    >
                      {resendLoading ? 'Sending…' : 'Resend verification email'}
                    </button>
                  )}
                </div>
              )}

              <signInForm.Subscribe selector={(s) => s.isSubmitting}>
                {(isSubmitting) => (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
                  >
                    {isSubmitting ? 'Signing in…' : 'Sign in'}
                  </button>
                )}
              </signInForm.Subscribe>
            </form>
          )}

          {/* Sign up */}
          {tab === 'signup' && !signupDone && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                signUpForm.handleSubmit()
              }}
              className="space-y-4"
            >
              <signUpForm.Field
                name="name"
                validators={{ onChange: signUpSchema.shape.name }}
              >
                {(field) => (
                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder="Name"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className={inputClass}
                    />
                    <FieldError errors={field.state.meta.errors } />
                  </div>
                )}
              </signUpForm.Field>
              <signUpForm.Field
                name="email"
                validators={{ onChange: signUpSchema.shape.email }}
              >
                {(field) => (
                  <div className="space-y-1">
                    <input
                      type="email"
                      placeholder="Email"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className={inputClass}
                    />
                    <FieldError errors={field.state.meta.errors } />
                  </div>
                )}
              </signUpForm.Field>
              <signUpForm.Field
                name="password"
                validators={{ onChange: signUpSchema.shape.password }}
              >
                {(field) => (
                  <div className="space-y-1">
                    <input
                      type="password"
                      placeholder="Password (min 8 characters)"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className={inputClass}
                    />
                    <FieldError errors={field.state.meta.errors } />
                  </div>
                )}
              </signUpForm.Field>

              {authError && <p className="text-sm text-red-500 dark:text-red-400">{authError}</p>}

              <signUpForm.Subscribe selector={(s) => s.isSubmitting}>
                {(isSubmitting) => (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
                  >
                    {isSubmitting ? 'Creating account…' : 'Create account'}
                  </button>
                )}
              </signUpForm.Subscribe>
            </form>
          )}

          {tab === 'signup' && signupDone && (
            <div className="text-center py-4 space-y-3">
              <div className="text-4xl">📧</div>
              <p className="text-gray-900 dark:text-white font-semibold">Check your email</p>
              <p className="text-gray-500 dark:text-white/50 text-sm">
                We sent a verification link to your inbox. Click it to activate your account.
              </p>
            </div>
          )}

          {/* Magic link */}
          {tab === 'magic' && !magicSent && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                magicForm.handleSubmit()
              }}
              className="space-y-4"
            >
              <p className="text-sm text-gray-500 dark:text-white/50">
                Enter your email and we&apos;ll send you a sign-in link — no password needed.
              </p>
              <magicForm.Field
                name="email"
                validators={{ onChange: magicLinkSchema.shape.email }}
              >
                {(field) => (
                  <div className="space-y-1">
                    <input
                      type="email"
                      placeholder="Email"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      autoFocus
                      className={inputClass}
                    />
                    <FieldError errors={field.state.meta.errors } />
                  </div>
                )}
              </magicForm.Field>

              {authError && <p className="text-sm text-red-500 dark:text-red-400">{authError}</p>}

              <magicForm.Subscribe selector={(s) => s.isSubmitting}>
                {(isSubmitting) => (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
                  >
                    {isSubmitting ? 'Sending…' : 'Send sign-in link'}
                  </button>
                )}
              </magicForm.Subscribe>
            </form>
          )}

          {tab === 'magic' && magicSent && (
            <div className="text-center py-4 space-y-3">
              <div className="text-4xl">✨</div>
              <p className="text-gray-900 dark:text-white font-semibold">Check your email</p>
              <p className="text-gray-500 dark:text-white/50 text-sm">
                We sent a sign-in link to your inbox. It expires in 5 minutes.
              </p>
            </div>
          )}

          {/* Google OAuth — shown on signin/signup tabs */}
          {(tab === 'signin' || tab === 'signup') && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 border-t border-gray-200 dark:border-white/10" />
                <span className="text-gray-400 dark:text-white/40 text-sm">or</span>
                <div className="flex-1 border-t border-gray-200 dark:border-white/10" />
              </div>

              <button
                onClick={() => authClient.signIn.social({ provider: 'google', callbackURL: '/' })}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/20 dark:text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
