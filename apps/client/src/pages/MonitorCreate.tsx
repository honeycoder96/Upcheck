import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/axios'
import type { CreateMonitorInput } from '@uptimemonitor/shared/schemas'
import AuthLayout from '../components/layout/AuthLayout'
import PageHeader from '../components/shared/PageHeader'
import { Button } from '../components/ui/button'
import MonitorForm from '../components/monitors/MonitorForm'

export default function MonitorCreate() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  async function handleSubmit(data: CreateMonitorInput) {
    await apiClient.post('/monitors', data)
    await qc.invalidateQueries({ queryKey: ['monitors'] })
    toast.success('Monitor created')
    navigate('/')
  }

  return (
    <AuthLayout>
      <PageHeader
        title="Add Monitor"
        description="Configure a new monitor to track uptime"
        action={
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />
      <div className="max-w-2xl">
        <MonitorForm
          mode="create"
          submitLabel="Create monitor"
          isSubmitting={false}
          onSubmit={handleSubmit}
        />
      </div>
    </AuthLayout>
  )
}
