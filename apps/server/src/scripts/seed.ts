import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { Organisation } from '../models/organisation.model'
import { User } from '../models/user.model'

const MONGODB_URI = process.env.MONGODB_URI
const SEED_ORG_NAME = process.env.SEED_ORG_NAME
const SEED_ORG_SLUG = process.env.SEED_ORG_SLUG
const SEED_USER_EMAIL = process.env.SEED_USER_EMAIL
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD

async function seed() {
  const missing = ['MONGODB_URI', 'SEED_ORG_NAME', 'SEED_ORG_SLUG', 'SEED_USER_EMAIL', 'SEED_USER_PASSWORD']
    .filter(key => !process.env[key])
  if (missing.length > 0) {
    console.error(`Missing env vars: ${missing.join(', ')}`)
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI!)
  console.log('Connected to MongoDB')

  // Seed org
  let org = await Organisation.findOne({ slug: SEED_ORG_SLUG })
  if (org) {
    console.log(`Org already exists: ${org.slug}`)
  } else {
    org = await Organisation.create({
      name: SEED_ORG_NAME,
      slug: SEED_ORG_SLUG,
      plan: 'free',
      planLimits: { maxMonitors: 20 },
    })
    console.log(`Created org: ${org.slug}`)
  }

  // Seed user
  const existingUser = await User.findOne({ email: SEED_USER_EMAIL!.toLowerCase() })
  if (existingUser) {
    console.log(`User already exists: ${existingUser.email}`)
  } else {
    const passwordHash = await bcrypt.hash(SEED_USER_PASSWORD!, 12)
    await User.create({
      orgId: org._id,
      email: SEED_USER_EMAIL!.toLowerCase(),
      passwordHash,
      role: 'owner',
    })
    console.log(`Created user: ${SEED_USER_EMAIL}`)
  }

  await mongoose.disconnect()
  console.log('Seed complete')
  process.exit(0)
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
