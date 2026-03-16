import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { UpdateOrgSchema, UpdateOrgInput } from '@uptimemonitor/shared/schemas'
import { useOrg, useUpdateOrg } from '../hooks/useOrg'
import { useRole } from '../hooks/useRole'
import AuthLayout from '../components/layout/AuthLayout'
import PageHeader from '../components/shared/PageHeader'
import InlineError from '../components/shared/InlineError'
import { Button } from '../components/ui/button'

export default function OrgSettings() {
  const { data: org, isLoading } = useOrg()
  const updateMutation = useUpdateOrg()
  const { isOwner } = useRole()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateOrgInput>({
    resolver: zodResolver(UpdateOrgSchema),
  })

  useEffect(() => {
    if (org) {
      reset({ name: org.name, slug: org.slug })
    }
  }, [org, reset])

  const onSubmit = async (data: UpdateOrgInput) => {
    try {
      await updateMutation.mutateAsync(data)
      toast.success('Organisation updated')
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message
      if (msg?.includes('slug')) {
        toast.error('That slug is already taken. Choose another.')
      } else {
        toast.error(msg ?? 'Failed to update')
      }
    }
  }

  return (
    <AuthLayout>
      <PageHeader
        title="Organisation"
        description="Manage your organisation's name and public slug"
      />

      <div className="max-w-lg">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-10 w-full rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5 rounded-lg border border-border bg-card p-6"
          >
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Organisation name
              </label>
              <input
                type="text"
                disabled={!isOwner}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                {...register('name')}
              />
              {errors.name && <InlineError message={errors.name.message!} />}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">status/</span>
                <input
                  type="text"
                  disabled={!isOwner}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 font-mono"
                  placeholder="your-org"
                  {...register('slug')}
                />
              </div>
              {errors.slug && <InlineError message={errors.slug.message!} />}
              <p className="text-xs text-muted-foreground">
                Used in your public status page URL. Only lowercase letters, numbers, and hyphens.
              </p>
            </div>

            {/* Plan info */}
            <div className="rounded-md border border-border bg-muted/40 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plan</p>
              <p className="text-sm text-foreground capitalize">{org?.plan}</p>
              <p className="text-xs text-muted-foreground">
                {org?.planLimits.maxMonitors} monitors included
              </p>
            </div>

            {isOwner && (
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting || !isDirty}>
                  {isSubmitting ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            )}
          </form>
        )}
      </div>
    </AuthLayout>
  )
}
