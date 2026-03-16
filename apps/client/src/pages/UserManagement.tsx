import { useState } from 'react'
import { UserPlus, Trash2, ShieldCheck, Eye, Crown } from 'lucide-react'
import { toast } from 'sonner'
import {
  useUsers,
  useCreateUser,
  useUpdateUserRole,
  useDeleteUser,
} from '../hooks/useUsers'
import type { OrgUser } from '../hooks/useUsers'
import { useRole } from '../hooks/useRole'
import { useAuthStore } from '../stores/auth.store'
import AuthLayout from '../components/layout/AuthLayout'
import PageHeader from '../components/shared/PageHeader'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '../components/ui/sheet'
import { Button } from '../components/ui/button'

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: OrgUser['role'] }) {
  if (role === 'owner') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
        <Crown className="h-3 w-3" />
        Owner
      </span>
    )
  }
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
        <ShieldCheck className="h-3 w-3" />
        Admin
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      <Eye className="h-3 w-3" />
      Viewer
    </span>
  )
}

// ── Invite sheet ──────────────────────────────────────────────────────────────

interface InviteSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function InviteSheet({ open, onOpenChange }: InviteSheetProps) {
  const createMutation = useCreateUser()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address')
      return
    }
    setSubmitting(true)
    try {
      await createMutation.mutateAsync({ email, role })
      toast.success('Invitation sent. A temporary password was emailed to the user.')
      setEmail('')
      setRole('viewer')
      onOpenChange(false)
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message
      if (msg?.includes('already exists')) {
        setError('A user with this email already exists')
      } else {
        toast.error(msg ?? 'Failed to invite user')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Invite user</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-5 pt-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Role</label>
            <div className="flex gap-2">
              {(['viewer', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    role === r
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background text-foreground hover:bg-accent'
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {role === 'admin'
                ? 'Can create, edit, and delete monitors and alert channels.'
                : 'Read-only access — can view monitors and logs.'}
            </p>
          </div>

          <div className="flex-1" />

          <SheetFooter className="gap-2">
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Sending invite…' : 'Send invite'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UserManagement() {
  const { data: users = [], isLoading } = useUsers()
  const updateRoleMutation = useUpdateUserRole()
  const deleteMutation = useDeleteUser()
  const { isOwner } = useRole()
  const currentUserId = useAuthStore((s) => s.user?.userId)

  const [inviteOpen, setInviteOpen] = useState(false)

  async function handleRoleChange(user: OrgUser, newRole: 'admin' | 'viewer') {
    try {
      await updateRoleMutation.mutateAsync({ id: user._id, data: { role: newRole } })
      toast.success(`${user.email} is now ${newRole}`)
    } catch {
      toast.error('Failed to update role')
    }
  }

  async function handleDelete(u: OrgUser) {
    try {
      await deleteMutation.mutateAsync(u._id)
      toast.success(`${u.email} removed`)
    } catch {
      toast.error('Failed to remove user')
    }
  }

  return (
    <AuthLayout>
      <PageHeader
        title="Team"
        description="Manage who has access to your organisation"
        action={
          isOwner ? (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite user
            </Button>
          ) : undefined
        }
      />

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {isLoading ? (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {[...Array(3)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(3)].map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                {isOwner && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u._id}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{u.email}</span>
                    {u._id === currentUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isOwner && u.role !== 'owner' && u._id !== currentUserId ? (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u, e.target.value as 'admin' | 'viewer')}
                        className="rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <RoleBadge role={u.role} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.mustChangePassword ? (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Pending first login
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Active</span>
                    )}
                  </td>
                  {isOwner && (
                    <td className="px-4 py-3 text-right">
                      {u.role !== 'owner' && u._id !== currentUserId && (
                        <ConfirmDialog
                          title="Remove user"
                          description={`Remove ${u.email} from your organisation? They will lose access immediately.`}
                          onConfirm={() => handleDelete(u)}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </ConfirmDialog>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <InviteSheet open={inviteOpen} onOpenChange={setInviteOpen} />

    </AuthLayout>
  )
}
