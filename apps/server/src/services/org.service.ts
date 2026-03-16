import { Organisation } from '../models/organisation.model'
import { AppError } from '../middleware/errorHandler'
import { ORG_NOT_FOUND } from '@uptimemonitor/shared/strings'
import type { UpdateOrgInput } from '@uptimemonitor/shared/schemas'

export async function getOrg(orgId: string) {
  const org = await Organisation.findById(orgId).lean()
  if (!org) throw new AppError(404, ORG_NOT_FOUND, 'Organisation not found')
  return org
}

export async function updateOrg(orgId: string, data: UpdateOrgInput) {
  if (data.slug) {
    const conflict = await Organisation.findOne({ slug: data.slug, _id: { $ne: orgId } }).lean()
    if (conflict) throw new AppError(409, 'SLUG_TAKEN', 'This slug is already in use')
  }

  const org = await Organisation.findByIdAndUpdate(
    orgId,
    { $set: data },
    { new: true }
  ).lean()

  if (!org) throw new AppError(404, ORG_NOT_FOUND, 'Organisation not found')
  return org
}
