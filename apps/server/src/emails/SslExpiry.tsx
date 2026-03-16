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

interface SslExpiryProps {
  monitorName: string
  host: string
  daysRemaining: number
  expiresAt: string
}

export function SslExpiry({ monitorName, host, daysRemaining, expiresAt }: SslExpiryProps) {
  const isUrgent = daysRemaining <= 7
  return (
    <Html>
      <Head />
      <Preview>{`SSL certificate for ${host} expires in ${daysRemaining} days`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={isUrgent ? headerUrgent : headerWarning}>
            <Text style={isUrgent ? statusDotUrgent : statusDotWarning}>⚠</Text>
            <Text style={title}>SSL Certificate Expiring</Text>
          </Section>
          <Section style={content}>
            <Text style={label}>Monitor</Text>
            <Text style={value}>{monitorName}</Text>

            <Text style={label}>Host</Text>
            <Text style={value}>{host}</Text>

            <Text style={label}>Days remaining</Text>
            <Text style={isUrgent ? daysUrgent : daysWarning}>{daysRemaining} days</Text>

            <Text style={label}>Expires at</Text>
            <Text style={value}>{expiresAt}</Text>
          </Section>
          <Hr style={divider} />
          <Text style={footer}>Uptime Monitor · Renew your certificate before it expires to avoid downtime.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default SslExpiry

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

const headerWarning: React.CSSProperties = {
  backgroundColor: '#fffbeb',
  borderBottom: '1px solid #fde68a',
  padding: '20px 24px',
}

const headerUrgent: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  borderBottom: '1px solid #fecaca',
  padding: '20px 24px',
}

const statusDotWarning: React.CSSProperties = {
  color: '#f59e0b',
  fontSize: '18px',
  margin: '0',
  display: 'inline',
}

const statusDotUrgent: React.CSSProperties = {
  color: '#ef4444',
  fontSize: '18px',
  margin: '0',
  display: 'inline',
}

const title: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 0 8px',
  display: 'inline',
}

const content: React.CSSProperties = {
  padding: '24px',
}

const label: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: '16px 0 4px',
}

const value: React.CSSProperties = {
  fontSize: '14px',
  color: '#111827',
  margin: '0',
  fontFamily: 'monospace',
}

const daysWarning: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#d97706',
  margin: '0',
}

const daysUrgent: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#dc2626',
  margin: '0',
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
