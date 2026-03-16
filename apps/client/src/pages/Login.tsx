import { useNavigate, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { LoginSchema, LoginInput } from '@uptimemonitor/shared/schemas'
import { apiClient } from '../lib/axios'
import { useAuthStore, AuthUser } from '../stores/auth.store'
import InlineError from '../components/shared/InlineError'
import { Button } from '../components/ui/button'

export default function LoginPage() {
  const { user, setAuth } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  })

  if (user && !user.mustChangePassword) return <Navigate to="/dashboard" replace />

  const onSubmit = async (data: LoginInput) => {
    try {
      const res = await apiClient.post('/auth/login', data)
      const { accessToken, user: authUser } = res.data.data as { accessToken: string; user: AuthUser }
      setAuth(accessToken, authUser)
      navigate(authUser.mustChangePassword ? '/change-password' : '/dashboard')
    } catch (err: any) {
      const code = err?.response?.data?.error?.code
      if (code === 'INVALID_CREDENTIALS') {
        setError('root', { message: 'Invalid email or password' })
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8 border border-border rounded-lg bg-card">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
          <p className="text-sm text-muted-foreground">Enter your credentials to continue</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errors.root && (
            <div className="p-3 rounded bg-muted text-sm text-foreground">
              {errors.root.message}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className="w-full px-3 py-2 text-sm border border-input rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <InlineError message={errors.email?.message} />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              className="w-full px-3 py-2 text-sm border border-input rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <InlineError message={errors.password?.message} />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in\u2026' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
