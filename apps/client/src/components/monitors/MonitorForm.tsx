import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Copy, Check } from 'lucide-react'
import { CreateMonitorSchema, type CreateMonitorInput } from '@uptimemonitor/shared/schemas'
import { HTTP_METHODS, MONITOR_TYPES } from '@uptimemonitor/shared/constants'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

// ── Shared styling ────────────────────────────────────────────────────────────

export const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'

export const selectCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

// ── Field wrapper ─────────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export function Field({ label, htmlFor, hint, error, required, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ── Custom headers manager ────────────────────────────────────────────────────

interface HeaderRow { key: string; value: string }

function CustomHeaders({ onChange }: { onChange: (v: Record<string, string>) => void }) {
  const [rows, setRows] = useState<HeaderRow[]>([])

  function update(updated: HeaderRow[]) {
    setRows(updated)
    const record: Record<string, string> = {}
    for (const r of updated) { if (r.key.trim()) record[r.key.trim()] = r.value }
    onChange(record)
  }

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            type="text" placeholder="Header name" value={row.key}
            onChange={(e) => update(rows.map((r, idx) => idx === i ? { ...r, key: e.target.value } : r))}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="text" placeholder="Value" value={row.value}
            onChange={(e) => update(rows.map((r, idx) => idx === i ? { ...r, value: e.target.value } : r))}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="button" onClick={() => update(rows.filter((_, idx) => idx !== i))}
            className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-accent transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => update([...rows, { key: '', value: '' }])}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <Plus className="h-3.5 w-3.5" /> Add header
      </button>
    </div>
  )
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button type="button" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

// ── Type label map ────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  http: 'HTTP / HTTPS',
  keyword: 'Keyword',
  ping: 'Ping',
  port: 'TCP Port',
  ssl: 'SSL Certificate',
  heartbeat: 'Heartbeat / Cron',
}

// ── Main form component ───────────────────────────────────────────────────────

export interface MonitorFormProps {
  defaultValues?: Partial<CreateMonitorInput>
  onSubmit: (data: CreateMonitorInput) => Promise<void>
  isSubmitting: boolean
  submitLabel: string
  mode: 'create' | 'edit'
  heartbeatToken?: string  // shown in edit mode for heartbeat monitors
}

export default function MonitorForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  mode,
  heartbeatToken,
}: MonitorFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateMonitorInput>({
    resolver: zodResolver(CreateMonitorSchema),
    defaultValues: {
      type: 'http',
      httpMethod: 'GET',
      interval: 5,
      expectedStatusCodes: [],
      customHeaders: {},
      keywordPresent: true,
      ...defaultValues,
    },
  })

  const type = watch('type')
  const isHttp = type === 'http'
  const isKeyword = type === 'keyword'
  const isHttpBased = isHttp || isKeyword || type === 'ssl'
  const isPingPort = type === 'ping' || type === 'port'
  const isHeartbeat = type === 'heartbeat'

  const heartbeatUrl = heartbeatToken
    ? `${(import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000/api/v1'}/heartbeat/${heartbeatToken}`
    : null

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* ── Monitor type ─────────────────────────────────────────────────── */}
      <Field label="Monitor type" htmlFor="type" required>
        <select
          id="type"
          className={selectCls}
          {...register('type')}
          disabled={mode === 'edit'}
        >
          {MONITOR_TYPES.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
          ))}
        </select>
        {mode === 'edit' && (
          <p className="text-xs text-muted-foreground mt-1">Monitor type cannot be changed after creation.</p>
        )}
      </Field>

      {/* ── Name ─────────────────────────────────────────────────────────── */}
      <Field label="Monitor name" htmlFor="name" required error={errors.name?.message}>
        <input id="name" type="text" placeholder="My website"
          className={cn(inputCls, errors.name && 'border-destructive')}
          {...register('name')} />
      </Field>

      {/* ── URL (HTTP / Keyword / SSL) ────────────────────────────────────── */}
      {isHttpBased && (
        <Field label="URL" htmlFor="url" required hint="Include the protocol, e.g. https://example.com"
          error={errors.url?.message}>
          <input id="url" type="url" placeholder="https://example.com"
            className={cn(inputCls, errors.url && 'border-destructive')}
            {...register('url')} />
        </Field>
      )}

      {/* ── Host (Ping / Port) ────────────────────────────────────────────── */}
      {isPingPort && (
        <Field label="Host" htmlFor="host" required error={errors.host?.message}>
          <input id="host" type="text" placeholder="example.com or 192.168.1.1"
            className={cn(inputCls, errors.host && 'border-destructive')}
            {...register('host')} />
        </Field>
      )}

      {/* ── Port number ──────────────────────────────────────────────────── */}
      {type === 'port' && (
        <Field label="Port" htmlFor="port" required error={errors.port?.message}>
          <input id="port" type="number" min={1} max={65535} placeholder="443"
            className={cn(inputCls, errors.port && 'border-destructive')}
            {...register('port', { valueAsNumber: true })} />
        </Field>
      )}

      {/* ── HTTP method + interval ────────────────────────────────────────── */}
      {(isHttp || isKeyword) && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="HTTP method" htmlFor="httpMethod">
            <select id="httpMethod" className={selectCls} {...register('httpMethod')}>
              {HTTP_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <IntervalField register={register} errors={errors} label="Check interval" />
        </div>
      )}

      {/* ── Interval (standalone — non-HTTP types) ───────────────────────── */}
      {!isHttp && !isKeyword && (
        <IntervalField
          register={register}
          errors={errors}
          label={isHeartbeat ? 'Grace period' : 'Check interval'}
          hint={isHeartbeat ? 'How long to wait before marking as down if no ping received' : undefined}
        />
      )}

      {/* ── Keyword ──────────────────────────────────────────────────────── */}
      {isKeyword && (
        <>
          <Field label="Keyword" htmlFor="keyword" required error={errors.keyword?.message}>
            <input id="keyword" type="text" placeholder="OK" className={cn(inputCls, errors.keyword && 'border-destructive')}
              {...register('keyword')} />
          </Field>
          <Field label="Keyword rule" htmlFor="keywordPresent">
            <select id="keywordPresent" className={selectCls}
              {...register('keywordPresent', { setValueAs: (v) => v === 'true' || v === true })}>
              <option value="true">Must contain keyword</option>
              <option value="false">Must NOT contain keyword</option>
            </select>
          </Field>
        </>
      )}

      {/* ── Expected status codes (HTTP / Keyword) ───────────────────────── */}
      {(isHttp || isKeyword) && (
        <Field label="Expected status codes" htmlFor="expectedStatusCodes"
          hint="Comma-separated, e.g. 200,201. Leave blank to accept any 2xx/3xx."
          error={errors.expectedStatusCodes?.message as string | undefined}>
          <input id="expectedStatusCodes" type="text" placeholder="200, 201" className={inputCls}
            {...register('expectedStatusCodes', {
              setValueAs: (v: unknown) => {
                if (Array.isArray(v)) return v
                if (typeof v === 'string' && v.trim() === '') return []
                if (typeof v === 'string') {
                  return v.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n) && n > 0)
                }
                return []
              },
            })} />
        </Field>
      )}

      {/* ── Timeout ──────────────────────────────────────────────────────── */}
      {!isHeartbeat && (
        <Field label="Timeout (ms)" htmlFor="timeout"
          hint={`Max wait before marking as down. Default: ${type === 'http' || type === 'keyword' || type === 'ssl' ? '30 000' : '10 000'} ms`}
          error={errors.timeout?.message}>
          <input id="timeout" type="number" min={1000} max={60000} step={1000}
            placeholder={type === 'http' || type === 'keyword' || type === 'ssl' ? '30000' : '10000'}
            className={inputCls} {...register('timeout', { valueAsNumber: true })} />
        </Field>
      )}

      {/* ── Custom headers (HTTP / Keyword) ─────────────────────────────── */}
      {(isHttp || isKeyword) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Custom headers</span>
            <span className="text-xs text-muted-foreground">Optional</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Sent with every check request. Useful for auth tokens or API keys.
          </p>
          <CustomHeaders onChange={(h) => setValue('customHeaders', h)} />
        </div>
      )}

      {/* ── Maintenance window ───────────────────────────────────────────── */}
      {!isHeartbeat && (
        <MaintenanceWindowField register={register} errors={errors} />
      )}

      {/* ── Heartbeat inbound URL (edit mode only) ───────────────────────── */}
      {isHeartbeat && heartbeatUrl && (
        <Field label="Ping URL" hint="Call this URL (POST or GET) to reset the grace-period timer.">
          <div className="flex items-center gap-2">
            <input type="text" readOnly value={heartbeatUrl}
              className={cn(inputCls, 'font-mono text-xs text-muted-foreground bg-muted')} />
            <CopyButton text={heartbeatUrl} />
          </div>
        </Field>
      )}

      {/* ── Submit ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

// ── Interval sub-field ────────────────────────────────────────────────────────

interface IntervalFieldProps {
  register: ReturnType<typeof useForm<CreateMonitorInput>>['register']
  errors: ReturnType<typeof useForm<CreateMonitorInput>>['formState']['errors']
  label: string
  hint?: string
}

function IntervalField({ register, errors, label, hint }: IntervalFieldProps) {
  return (
    <Field label={label} htmlFor="interval" hint={hint} error={errors.interval?.message}>
      <select id="interval" className={cn(selectCls, errors.interval && 'border-destructive')}
        {...register('interval', { valueAsNumber: true })}>
        <option value={1}>Every 1 minute</option>
        <option value={5}>Every 5 minutes</option>
        <option value={15}>Every 15 minutes</option>
        <option value={30}>Every 30 minutes</option>
        <option value={60}>Every hour</option>
      </select>
    </Field>
  )
}

// ── Maintenance window sub-field ──────────────────────────────────────────────

interface MaintenanceFieldProps {
  register: ReturnType<typeof useForm<CreateMonitorInput>>['register']
  errors: ReturnType<typeof useForm<CreateMonitorInput>>['formState']['errors']
}

function MaintenanceWindowField({ register, errors }: MaintenanceFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Maintenance window</span>
        <span className="text-xs text-muted-foreground">Optional — alerts suppressed during window</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start" htmlFor="mwStart">
          <input id="mwStart" type="datetime-local" className={inputCls}
            {...register('maintenanceWindow.start' as never)} />
        </Field>
        <Field label="End" htmlFor="mwEnd">
          <input id="mwEnd" type="datetime-local" className={inputCls}
            {...register('maintenanceWindow.end' as never)} />
        </Field>
      </div>
    </div>
  )
}
