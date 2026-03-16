import { z } from 'zod';
import { MONITOR_TYPES, HTTP_METHODS } from '../constants/index';

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
  details: z
    .array(
      z.object({
        code: z.string(),
        message: z.string(),
        field: z.string().optional(),
      })
    )
    .optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export function ApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema.nullable(),
    error: ApiErrorSchema.nullable(),
    message: z.string().nullable(),
  });
}

export type ApiResponse<T> = {
  data: T | null;
  error: ApiError | null;
  message: string | null;
};

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
export type LoginInput = z.infer<typeof LoginSchema>

// ── Monitor schemas ─────────────────────────────────────────────────────────

const monitorBaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
  type: z.enum(MONITOR_TYPES),
  url: z.string().url('Must be a valid URL').optional(),
  host: z.string().min(1).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  keyword: z.string().min(1).optional(),
  keywordPresent: z.boolean().default(true),
  httpMethod: z.enum(HTTP_METHODS).default('GET'),
  expectedStatusCodes: z.array(z.number().int().min(100).max(599)).default([]),
  customHeaders: z.record(z.string()).default({}),
  interval: z.union([
    z.literal(1),
    z.literal(5),
    z.literal(15),
    z.literal(30),
    z.literal(60),
  ]),
  timeout: z.number().int().min(1000).max(60000).optional(),
})

export const CreateMonitorSchema = monitorBaseSchema
  .refine(
    (d) => !['http', 'keyword', 'ssl'].includes(d.type) || !!d.url,
    { message: 'URL is required for HTTP / Keyword / SSL monitors', path: ['url'] }
  )
  .refine(
    (d) => !['ping', 'port'].includes(d.type) || !!d.host,
    { message: 'Host is required for Ping / Port monitors', path: ['host'] }
  )
  .refine(
    (d) => d.type !== 'port' || d.port !== undefined,
    { message: 'Port number is required for Port monitors', path: ['port'] }
  )
  .refine(
    (d) => d.type !== 'keyword' || !!d.keyword,
    { message: 'Keyword is required for Keyword monitors', path: ['keyword'] }
  )

export type CreateMonitorInput = z.infer<typeof CreateMonitorSchema>

// Partial update — cross-field refinements not enforced on partial edits
export const UpdateMonitorSchema = monitorBaseSchema.partial()
export type UpdateMonitorInput = z.infer<typeof UpdateMonitorSchema>

// ── Alert channel schemas ────────────────────────────────────────────────────

const emailConfigSchema = z.object({
  email: z.string().email('Must be a valid email address'),
})

const webhookConfigSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  secret: z.string().optional(),
})

const telegramConfigSchema = z.object({
  botToken: z.string().min(1, 'Bot token is required'),
  chatId: z.string().min(1, 'Chat ID is required'),
})

const slackConfigSchema = z.object({
  slackWebhookUrl: z.string().url('Must be a valid URL'),
})

export const CreateAlertChannelSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email'),
    config: emailConfigSchema,
    monitorIds: z.array(z.string()).default([]),
  }),
  z.object({
    type: z.literal('webhook'),
    config: webhookConfigSchema,
    monitorIds: z.array(z.string()).default([]),
  }),
  z.object({
    type: z.literal('telegram'),
    config: telegramConfigSchema,
    monitorIds: z.array(z.string()).default([]),
  }),
  z.object({
    type: z.literal('slack'),
    config: slackConfigSchema,
    monitorIds: z.array(z.string()).default([]),
  }),
])
export type CreateAlertChannelInput = z.infer<typeof CreateAlertChannelSchema>

export const UpdateAlertChannelSchema = z.object({
  config: z.union([emailConfigSchema, webhookConfigSchema, telegramConfigSchema, slackConfigSchema]).optional(),
  monitorIds: z.array(z.string()).optional(),
  // secret is write-only — if provided, it replaces the existing secret
  newSecret: z.string().optional(),
})
export type UpdateAlertChannelInput = z.infer<typeof UpdateAlertChannelSchema>

export const TestAlertChannelSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('telegram'), config: telegramConfigSchema }),
  z.object({ type: z.literal('slack'), config: slackConfigSchema }),
])
export type TestAlertChannelInput = z.infer<typeof TestAlertChannelSchema>

// ── User schemas ─────────────────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  role: z.enum(['admin', 'viewer']),
})
export type CreateUserInput = z.infer<typeof CreateUserSchema>

export const UpdateUserRoleSchema = z.object({
  role: z.enum(['admin', 'viewer']),
})
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>

export const ChangePasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>

// ── Org schemas ──────────────────────────────────────────────────────────────

export const UpdateOrgSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
    .optional(),
})
export type UpdateOrgInput = z.infer<typeof UpdateOrgSchema>
