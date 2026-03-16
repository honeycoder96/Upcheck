import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/axios'
import type { CreateMonitorInput } from '@uptimemonitor/shared/schemas'
import { useMonitorDetail } from '../hooks/useMonitorDetail'
import AuthLayout from '../components/layout/AuthLayout'
import PageHeader from '../components/shared/PageHeader'
import { Button } from '../components/ui/button'
import MonitorForm from '../components/monitors/MonitorForm'

export default function MonitorEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: monitor, isLoading } = useMonitorDetail(id!)

  async function handleSubmit(data: CreateMonitorInput) {
    await apiClient.put(`/monitors/${id}`, data)
    await qc.invalidateQueries({ queryKey: ['monitors'] })
    await qc.invalidateQueries({ queryKey: ['monitor', id] })
    toast.success('Monitor updated')
    navigate(`/monitors/${id}`)
  }

  return (
    <AuthLayout>
      <PageHeader
        title={monitor ? `Edit — ${monitor.name}` : 'Edit Monitor'}
        action={
          <Button variant="outline" size="sm" onClick={() => navigate(id ? `/monitors/${id}` : '/')}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />
      <div className="max-w-2xl">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-10 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : monitor ? (
          <MonitorForm
            mode="edit"
            submitLabel="Save changes"
            isSubmitting={false}
            defaultValues={monitor as Partial<CreateMonitorInput>}
            heartbeatToken={monitor.type === 'heartbeat' ? monitor._id : undefined}
            onSubmit={handleSubmit}
          />
        ) : (
          <p className="text-muted-foreground text-sm">Monitor not found.</p>
        )}
      </div>
    </AuthLayout>
  )
}
