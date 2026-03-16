import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Preview,
} from '@react-email/components'
import * as React from 'react'

interface UserCreatedProps {
  email: string
  temporaryPassword: string
  orgName: string
  loginUrl: string
}

export function UserCreated({ email, temporaryPassword, orgName, loginUrl }: UserCreatedProps) {
  return (
    <Html>
      <Head />
      <Preview>{`You've been invited to ${orgName} on Uptime Monitor`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={title}>You've been invited</Text>
          </Section>
          <Section style={content}>
            <Text style={intro}>
              You've been added to <strong>{orgName}</strong> on Uptime Monitor. Use the credentials
              below to sign in. You'll be asked to set a new password on your first login.
            </Text>

            <Text style={label}>Email</Text>
            <Text style={monoValue}>{email}</Text>

            <Text style={label}>Temporary password</Text>
            <Text style={passwordBox}>{temporaryPassword}</Text>

            <Text style={ctaNote}>
              Sign in at: <span style={urlStyle}>{loginUrl}</span>
            </Text>
          </Section>
          <Hr style={divider} />
          <Text style={footer}>
            Uptime Monitor · If you did not expect this invitation, you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default UserCreated

const body: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

const container: React.CSSProperties = {
  maxWidth: '520px',
  margin: '40px auto',
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  overflow: 'hidden',
}

const header: React.CSSProperties = {
  backgroundColor: '#eff6ff',
  borderBottom: '1px solid #bfdbfe',
  padding: '20px 24px',
}

const title: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#1d4ed8',
  margin: '0',
}

const content: React.CSSProperties = {
  padding: '24px',
}

const intro: React.CSSProperties = {
  fontSize: '14px',
  color: '#374151',
  margin: '0 0 20px',
  lineHeight: '1.6',
}

const label: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: '16px 0 4px',
}

const monoValue: React.CSSProperties = {
  fontSize: '14px',
  color: '#111827',
  margin: '0',
  fontFamily: 'monospace',
}

const passwordBox: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '700',
  color: '#111827',
  margin: '0',
  fontFamily: 'monospace',
  backgroundColor: '#f3f4f6',
  padding: '10px 14px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  letterSpacing: '0.1em',
}

const ctaNote: React.CSSProperties = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '24px 0 0',
}

const urlStyle: React.CSSProperties = {
  color: '#2563eb',
  fontFamily: 'monospace',
}

const divider: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '0',
}

const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#9ca3af',
  padding: '16px 24px',
  margin: '0',
}
