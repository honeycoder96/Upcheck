import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ChangePasswordSchema, ChangePasswordInput } from '@uptimemonitor/shared/schemas'
import { apiClient } from '../lib/axios'
import { useAuthStore } from '../stores/auth.store'
import InlineError from '../components/shared/InlineError'
import { Button } from '../components/ui/button'

export default function ChangePasswordPage() {
  const { clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema),
  })

  const onSubmit = async (data: ChangePasswordInput) => {
    try {
      await apiClient.post('/auth/change-password', data)
      toast.success('Password changed. Please sign in with your new password.')
      clearAuth()
      navigate('/login')
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to change password.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Set your password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You must set a new password before continuing.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm"
        >
          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="block text-sm font-medium text-foreground">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="At least 8 characters"
              {...register('newPassword')}
            />
            {errors.newPassword && <InlineError message={errors.newPassword.message!} />}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Set password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
