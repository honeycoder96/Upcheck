import { useState } from 'react'
import { Bell, Mail, Webhook, Plus, Pencil, Trash2, Send, CheckCircle2, Info, Slack } from 'lucide-react'
import { toast } from 'sonner'
import {
  useAlertChannels,
  useCreateAlertChannel,
  useUpdateAlertChannel,
  useDeleteAlertChannel,
  useTestAlertChannel,
} from '../hooks/useAlertChannels'
import type { AlertChannel } from '../hooks/useAlertChannels'
import { useMonitors } from '../hooks/useMonitors'
import AuthLayout from '../components/layout/AuthLayout'
import PageHeader from '../components/shared/PageHeader'
import EmptyState from '../components/shared/EmptyState'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import InlineError from '../components/shared/InlineError'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '../components/ui/sheet'
import { Button } from '../components/ui/button'

// ── Channel Sheet (create / edit) ───────────────────────────────────────────

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm border border-input rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

interface ChannelSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: AlertChannel | null
}

function ChannelSheet({ open, onOpenChange, editing }: ChannelSheetProps) {
  const { data: monitors = [] } = useMonitors()
  const createMutation = useCreateAlertChannel()
  const updateMutation = useUpdateAlertChannel()
  const testMutation = useTestAlertChannel()

  const [type, setType] = useState<'email' | 'webhook' | 'telegram' | 'slack'>(editing?.type ?? 'email')
  const [emailValue, setEmailValue] = useState(editing?.type === 'email' ? (editing.config.email ?? '') : '')
  const [webhookUrl, setWebhookUrl] = useState(editing?.type === 'webhook' ? (editing.config.url ?? '') : '')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [botToken, setBotToken] = useState(editing?.type === 'telegram' ? (editing.config.botToken ?? '') : '')
  const [chatId, setChatId] = useState(editing?.type === 'telegram' ? (editing.config.chatId ?? '') : '')
  const [telegramTested, setTelegramTested] = useState(editing?.type === 'telegram')
  const [slackWebhookUrl, setSlackWebhookUrl] = useState(editing?.type === 'slack' ? (editing.config.slackWebhookUrl ?? '') : '')
  const [slackTested, setSlackTested] = useState(editing?.type === 'slack')
  const [selectedMonitorIds, setSelectedMonitorIds] = useState<string[]>(editing?.monitorIds ?? [])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const isEditing = !!editing

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (type === 'email') {
      if (!emailValue) e.email = 'Email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) e.email = 'Must be a valid email'
    } else if (type === 'webhook') {
      if (!webhookUrl) e.url = 'Webhook URL is required'
      else { try { new URL(webhookUrl) } catch { e.url = 'Must be a valid URL' } }
    } else if (type === 'telegram') {
      if (!botToken) e.botToken = 'Bot token is required'
      if (!chatId) e.chatId = 'Chat ID is required'
    } else {
      if (!slackWebhookUrl) e.slackWebhookUrl = 'Webhook URL is required'
      else { try { new URL(slackWebhookUrl) } catch { e.slackWebhookUrl = 'Must be a valid URL' } }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function getApiError(err: unknown): string {
    return (
      (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      ?? 'Connection test failed'
    )
  }

  async function handleTelegramTest() {
    const e: Record<string, string> = {}
    if (!botToken) e.botToken = 'Bot token is required'
    if (!chatId) e.chatId = 'Chat ID is required'
    setErrors(e)
    if (Object.keys(e).length > 0) return
    try {
      await testMutation.mutateAsync({ type: 'telegram', config: { botToken, chatId } })
      setTelegramTested(true)
      toast.success('Test message sent — check your Telegram chat!')
    } catch (err) {
      const raw = getApiError(err)
      toast.error(
        raw.toLowerCase().includes('chat not found')
          ? 'Chat not found — open your bot in Telegram and press Start, then try again.'
          : raw
      )
      setTelegramTested(false)
    }
  }

  async function handleSlackTest() {
    const e: Record<string, string> = {}
    if (!slackWebhookUrl) e.slackWebhookUrl = 'Webhook URL is required'
    else { try { new URL(slackWebhookUrl) } catch { e.slackWebhookUrl = 'Must be a valid URL' } }
    setErrors(e)
    if (Object.keys(e).length > 0) return
    try {
      await testMutation.mutateAsync({ type: 'slack', config: { slackWebhookUrl } })
      setSlackTested(true)
      toast.success('Test message sent — check your Slack channel!')
    } catch (err) {
      toast.error(getApiError(err))
      setSlackTested(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      if (isEditing) {
        const config =
          type === 'email' ? { email: emailValue }
          : type === 'webhook' ? { url: webhookUrl }
          : type === 'telegram' ? { botToken, chatId }
          : { slackWebhookUrl }
        const updateData: Parameters<typeof updateMutation.mutateAsync>[0]['data'] = {
          config,
          monitorIds: selectedMonitorIds,
        }
        if (webhookSecret) updateData.newSecret = webhookSecret
        await updateMutation.mutateAsync({ id: editing._id, data: updateData })
        toast.success('Alert channel updated')
      } else {
        const config =
          type === 'email' ? { email: emailValue }
          : type === 'webhook' ? { url: webhookUrl, secret: webhookSecret || undefined }
          : type === 'telegram' ? { botToken, chatId }
          : { slackWebhookUrl }
        await createMutation.mutateAsync({ type, config, monitorIds: selectedMonitorIds })
        toast.success('Alert channel created')
      }
      onOpenChange(false)
    } catch {
      toast.error(isEditing ? 'Failed to update alert channel' : 'Failed to create alert channel')
    } finally {
      setSubmitting(false)
    }
  }

  function toggleMonitor(id: string) {
    setSelectedMonitorIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  const canCreate =
    (type !== 'telegram' || telegramTested) &&
    (type !== 'slack' || slackTested)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit alert channel' : 'New alert channel'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-6">
          {/* Type dropdown */}
          {!isEditing && (
            <div className="space-y-1.5">
              <label htmlFor="ch-type" className="text-sm font-medium text-foreground">Type</label>
              <select
                id="ch-type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value as 'email' | 'webhook' | 'telegram' | 'slack')
                  setErrors({})
                  setTelegramTested(false)
                  setSlackTested(false)
                }}
                className={INPUT_CLASS}
              >
                <option value="email">✉️  Email</option>
                <option value="webhook">🔗  Webhook</option>
                <option value="telegram">✈️  Telegram</option>
                <option value="slack">💬  Slack</option>
              </select>
            </div>
          )}

          {/* Email config */}
          {type === 'email' && (
            <div className="space-y-1.5">
              <label htmlFor="ch-email" className="text-sm font-medium text-foreground">Email address</label>
              <input
                id="ch-email"
                type="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                placeholder="alerts@example.com"
                className={INPUT_CLASS}
              />
              <InlineError message={errors.email} />
            </div>
          )}

          {/* Webhook config */}
          {type === 'webhook' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="ch-url" className="text-sm font-medium text-foreground">Webhook URL</label>
                <input
                  id="ch-url"
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://example.com/webhook"
                  className={INPUT_CLASS}
                />
                <InlineError message={errors.url} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="ch-secret" className="text-sm font-medium text-foreground">
                  Signing secret
                  <span className="ml-1 text-xs text-muted-foreground font-normal">
                    {isEditing ? '(leave blank to keep existing)' : '(optional)'}
                  </span>
                </label>
                <input
                  id="ch-secret"
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder={isEditing ? '••••••••' : 'Optional HMAC-SHA256 signing secret'}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          )}

          {/* Telegram config */}
          {type === 'telegram' && (
            <div className="space-y-4">
              {/* Setup instructions */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3.5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">How to set up Telegram alerts</span>
                </div>
                <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>
                    Open Telegram and search for <strong>@BotFather</strong>. Send it <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/newbot</code> and follow the prompts. Copy the <strong>Bot Token</strong> it gives you.
                  </li>
                  <li>
                    Search for your new bot by its username and press <strong>Start</strong> — or add it to a group. <strong className="text-blue-800 dark:text-blue-200">You must do this before testing</strong>, otherwise Telegram will reject the message with "chat not found".
                  </li>
                  <li>
                    To get your <strong>Chat ID</strong>: message <strong>@userinfobot</strong> and it replies with your numeric ID. For a group, add <strong>@userinfobot</strong> to the group — the ID will start with <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">-</code>.
                  </li>
                  <li>Paste both values below and click <strong>Test Connection</strong>.</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ch-bot-token" className="text-sm font-medium text-foreground">Bot token</label>
                <input
                  id="ch-bot-token"
                  type="password"
                  value={botToken}
                  onChange={(e) => { setBotToken(e.target.value); setTelegramTested(false) }}
                  placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                  className={INPUT_CLASS}
                  autoComplete="off"
                />
                <InlineError message={errors.botToken} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ch-chat-id" className="text-sm font-medium text-foreground">Chat ID</label>
                <input
                  id="ch-chat-id"
                  type="text"
                  value={chatId}
                  onChange={(e) => { setChatId(e.target.value); setTelegramTested(false) }}
                  placeholder="123456789  or  -987654321 for groups"
                  className={INPUT_CLASS}
                />
                <InlineError message={errors.chatId} />
              </div>

              {/* Test button / success badge */}
              {!isEditing && (
                telegramTested ? (
                  <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">Connection verified</span>
                    <button
                      type="button"
                      onClick={() => setTelegramTested(false)}
                      className="ml-auto text-xs text-green-600 dark:text-green-400 underline underline-offset-2 hover:no-underline"
                    >
                      Re-test
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTelegramTest}
                    disabled={testMutation.isPending}
                    className="w-full"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {testMutation.isPending ? 'Sending test message…' : 'Test Connection'}
                  </Button>
                )
              )}
            </div>
          )}

          {/* Slack config */}
          {type === 'slack' && (
            <div className="space-y-4">
              {/* Setup instructions */}
              <div className="rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30 p-3.5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="text-sm font-semibold text-purple-800 dark:text-purple-300">How to get a Slack Webhook URL</span>
                </div>
                <ol className="text-xs text-purple-700 dark:text-purple-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>
                    Go to <strong>api.slack.com/apps</strong> and click <strong>Create New App</strong> → <strong>From scratch</strong>. Give it a name (e.g. "UptimeMonitor") and pick your workspace.
                  </li>
                  <li>
                    In the left sidebar, click <strong>Incoming Webhooks</strong> and toggle it <strong>On</strong>.
                  </li>
                  <li>
                    Click <strong>Add New Webhook to Workspace</strong>, pick the channel you want alerts in, then click <strong>Allow</strong>.
                  </li>
                  <li>
                    Copy the generated webhook URL (starts with <code className="bg-purple-100 dark:bg-purple-900 px-1 rounded">https://hooks.slack.com/services/</code>) and paste it below.
                  </li>
                  <li>Click <strong>Test Connection</strong> to verify.</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ch-slack-url" className="text-sm font-medium text-foreground">Slack Webhook URL</label>
                <input
                  id="ch-slack-url"
                  type="url"
                  value={slackWebhookUrl}
                  onChange={(e) => { setSlackWebhookUrl(e.target.value); if (!isEditing) setSlackTested(false) }}
                  placeholder="https://hooks.slack.com/services/..."
                  className={INPUT_CLASS}
                />
                <InlineError message={errors.slackWebhookUrl} />
              </div>

              {/* Test button / success badge */}
              {!isEditing && (
                slackTested ? (
                  <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">Connection verified</span>
                    <button
                      type="button"
                      onClick={() => setSlackTested(false)}
                      className="ml-auto text-xs text-green-600 dark:text-green-400 underline underline-offset-2 hover:no-underline"
                    >
                      Re-test
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSlackTest}
                    disabled={testMutation.isPending}
                    className="w-full"
                  >
                    <Slack className="h-3.5 w-3.5" />
                    {testMutation.isPending ? 'Sending test message…' : 'Test Connection'}
                  </Button>
                )
              )}
            </div>
          )}

          {/* Monitor association */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Monitors
              <span className="ml-1 text-xs text-muted-foreground font-normal">(select which monitors trigger this channel)</span>
            </label>
            {monitors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No monitors configured yet.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-md border border-input divide-y divide-border">
                {monitors.map((m) => (
                  <label
                    key={m._id}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-accent transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMonitorIds.includes(m._id)}
                      onChange={() => toggleMonitor(m._id)}
                      className="rounded border-input"
                    />
                    <span className="text-sm text-foreground">{m.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{m.type}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <SheetFooter className="gap-2 pt-2">
            <SheetClose asChild>
              <Button type="button" variant="outline" size="sm">Cancel</Button>
            </SheetClose>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !canCreate}
              title={!canCreate ? 'Test the connection first' : undefined}
            >
              {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create channel'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ── Channel row ──────────────────────────────────────────────────────────────

function ChannelRow({
  channel,
  onEdit,
  onDelete,
}: {
  channel: AlertChannel
  onEdit: () => void
  onDelete: () => void
}) {
  const configSummary =
    channel.type === 'email' ? channel.config.email ?? '—'
    : channel.type === 'webhook' ? channel.config.url ?? '—'
    : channel.type === 'telegram' ? `Chat ${channel.config.chatId ?? '—'}`
    : channel.config.slackWebhookUrl?.replace('https://hooks.slack.com/services/', 'hooks.slack.com/…/') ?? '—'

  const typeIcon =
    channel.type === 'email' ? <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
    : channel.type === 'webhook' ? <Webhook className="h-4 w-4 text-muted-foreground shrink-0" />
    : channel.type === 'telegram' ? <Send className="h-4 w-4 text-muted-foreground shrink-0" />
    : <Slack className="h-4 w-4 text-muted-foreground shrink-0" />

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {typeIcon}
          <span className="text-sm font-medium text-foreground capitalize">{channel.type}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-muted-foreground font-mono truncate max-w-[240px] block" title={configSummary}>
          {configSummary}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground text-sm">
        {channel.monitorIds.length} monitor{channel.monitorIds.length !== 1 ? 's' : ''}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onEdit}
            title="Edit"
            className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <ConfirmDialog
            title="Delete alert channel?"
            description="This channel will be permanently removed and will stop receiving alerts. This cannot be undone."
            onConfirm={onDelete}
          >
            <button
              title="Delete"
              className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </ConfirmDialog>
        </div>
      </td>
    </tr>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AlertChannels() {
  const { data: channels, isLoading } = useAlertChannels()
  const deleteMutation = useDeleteAlertChannel()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<AlertChannel | null>(null)

  function openCreate() {
    setEditing(null)
    setSheetOpen(true)
  }

  function openEdit(channel: AlertChannel) {
    setEditing(channel)
    setSheetOpen(true)
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Alert channel deleted')
    } catch {
      toast.error('Failed to delete alert channel')
    }
  }

  return (
    <AuthLayout>
      <PageHeader
        title="Alert Channels"
        description="Configure where to send alerts when monitors change status"
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Channel
          </Button>
        }
      />

      {isLoading ? (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Destination</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Monitors</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...Array(3)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(4)].map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !channels || channels.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-10 w-10" />}
          title="No alert channels yet"
          description="Create a channel to receive email, webhook, Telegram, or Slack notifications when monitors go down."
          action={{ label: 'New Channel', onClick: openCreate }}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Destination</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Monitors</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {channels.map((channel) => (
                <ChannelRow
                  key={channel._id}
                  channel={channel}
                  onEdit={() => openEdit(channel)}
                  onDelete={() => handleDelete(channel._id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ChannelSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) setEditing(null)
        }}
        editing={editing}
      />
    </AuthLayout>
  )
}
