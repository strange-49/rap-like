import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../backend/src/generated/prisma/client'
import { hashPassword } from '../backend/src/common/security/password'

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED_IN_PRODUCTION !== 'true') {
  throw new Error('Refusing to seed a production database. Set ALLOW_SEED_IN_PRODUCTION=true to override.')
}

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

async function main(): Promise<void> {
  const resetPasswords = process.env.SEED_RESET_PASSWORDS === 'true'

  for (const user of users) {
    const passwordHash = await hashPassword(user.password)
    await prisma.user.upsert({
      where: {
        username: user.username,
      },
      update: {
        ...(resetPasswords ? { passwordHash } : {}),
        role: user.role,
        tenantId: user.tenantId,
      },
      create: {
        username: user.username,
        passwordHash,
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
