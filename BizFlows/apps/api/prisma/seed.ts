import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined.');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  await prisma.role.upsert({
    where: { name: 'PLATFORM_ADMIN' },
    update: {
      description: 'Platform administrator with system-level access',
    },
    create: {
      name: 'PLATFORM_ADMIN',
      description: 'Platform administrator with system-level access',
    },
  });

  await prisma.role.upsert({
    where: { name: 'USER' },
    update: {
      description: 'Standard authenticated platform user',
    },
    create: {
      name: 'USER',
      description: 'Standard authenticated platform user',
    },
  });

  console.log('Initial roles seeded successfully.');
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
