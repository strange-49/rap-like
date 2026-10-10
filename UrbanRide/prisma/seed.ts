import 'dotenv/config'
import { scryptSync } from 'node:crypto'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../backend/src/generated/prisma/client'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured.')
}

const adapter = new PrismaPg({
  connectionString,
})

const prisma = new PrismaClient({
  adapter,
})

const users = [
  {
    username: 'customer',
    password: 'customer-dev-password',
    role: 'CUSTOMER' as const,
    tenantId: null,
  },
  {
    username: 'rider',
    password: 'rider-dev-password',
    role: 'RIDER' as const,
    tenantId: null,
  },
  {
    username: 'client_admin',
    password: 'client-admin-dev-password',
    role: 'CLIENT_ADMIN' as const,
    tenantId: 'demo-corporation',
  },
  {
    username: 'admin',
    password: 'admin-dev-password',
    role: 'ADMIN' as const,
    tenantId: null,
  },
]

function hashPassword(password: string, username: string): string {
  return scryptSync(password, username, 64).toString('hex')
}

async function main(): Promise<void> {
  for (const user of users) {
    await prisma.user.upsert({
      where: {
        username: user.username,
      },
      update: {
        passwordHash: hashPassword(user.password, user.username),
        role: user.role,
        tenantId: user.tenantId,
        active: true,
      },
      create: {
        username: user.username,
        passwordHash: hashPassword(user.password, user.username),
        role: user.role,
        tenantId: user.tenantId,
        active: true,
      },
    })
  }

  console.info('Authentication seed completed successfully.')
}

main()
  .catch((error: unknown) => {
    console.error('Database seed failed.', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })