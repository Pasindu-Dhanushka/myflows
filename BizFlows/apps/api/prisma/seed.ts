import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import * as argon2 from 'argon2';

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
  const roleDescriptions = {
    OWNER: 'Owner with full platform access',
    ADMIN: 'Administrator with user and role management access',
    USER: 'Standard authenticated platform user',
  } as const;

  const roles = await Promise.all(
    Object.entries(roleDescriptions).map(([name, description]) =>
      prisma.role.upsert({
        where: { name },
        update: { description },
        create: { name, description },
      }),
    ),
  );
  const adminRole = roles.find((role) => role.name === 'ADMIN');
  if (!adminRole) throw new Error('ADMIN role could not be seeded.');

  const passwordHash = await argon2.hash('Admin@123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {
      firstName: 'System',
      lastName: 'Admin',
      passwordHash,
      isActive: true,
      isEmailVerified: true,
    },
    create: {
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@gmail.com',
        passwordHash,
        isActive: true,
        isEmailVerified: true,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  console.log('System roles and development admin seeded successfully.');
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
