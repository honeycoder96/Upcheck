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

interface MonitorRecoveredProps {
  monitorName: string
  target: string
  downtimeDuration: string
  recoveredAt: string
}

export function MonitorRecovered({ monitorName, target, downtimeDuration, recoveredAt }: MonitorRecoveredProps) {
  return (
    <Html>
      <Head />
      <Preview>{monitorName} has recovered</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={statusDot}>●</Text>
            <Text style={title}>Monitor Recovered</Text>
          </Section>
          <Section style={content}>
            <Text style={label}>Monitor</Text>
            <Text style={value}>{monitorName}</Text>

            <Text style={label}>Target</Text>
            <Text style={value}>{target}</Text>

            <Text style={label}>Downtime duration</Text>
            <Text style={durationText}>{downtimeDuration}</Text>

            <Text style={label}>Recovered at</Text>
            <Text style={value}>{recoveredAt}</Text>
          </Section>
          <Hr style={divider} />
          <Text style={footer}>Uptime Monitor · You are receiving this because this monitor has an email alert channel configured.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default MonitorRecovered

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
  backgroundColor: '#f0fdf4',
  borderBottom: '1px solid #bbf7d0',
  padding: '20px 24px',
}

const statusDot: React.CSSProperties = {
  color: '#22c55e',
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

const durationText: React.CSSProperties = {
  fontSize: '14px',
  color: '#111827',
  margin: '0',
  fontWeight: '600',
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
