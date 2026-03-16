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

interface MonitorDownProps {
  monitorName: string
  target: string
  error: string
  checkedAt: string
}

export function MonitorDown({ monitorName, target, error, checkedAt }: MonitorDownProps) {
  return (
    <Html>
      <Head />
      <Preview>{monitorName} is DOWN</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={statusDot}>●</Text>
            <Text style={title}>Monitor Down</Text>
          </Section>
          <Section style={content}>
            <Text style={label}>Monitor</Text>
            <Text style={value}>{monitorName}</Text>

            <Text style={label}>Target</Text>
            <Text style={value}>{target}</Text>

            <Text style={label}>Error</Text>
            <Text style={errorText}>{error}</Text>

            <Text style={label}>Detected at</Text>
            <Text style={value}>{checkedAt}</Text>
          </Section>
          <Hr style={divider} />
          <Text style={footer}>Uptime Monitor · You are receiving this because this monitor has an email alert channel configured.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default MonitorDown

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
  backgroundColor: '#fef2f2',
  borderBottom: '1px solid #fecaca',
  padding: '20px 24px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
}

const statusDot: React.CSSProperties = {
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

const errorText: React.CSSProperties = {
  fontSize: '13px',
  color: '#dc2626',
  margin: '0',
  backgroundColor: '#fef2f2',
  padding: '8px 12px',
  borderRadius: '4px',
  border: '1px solid #fecaca',
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
