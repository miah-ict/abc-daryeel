import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema/index.js';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    if (!adminEmail) throw new Error('SEED_ADMIN_EMAIL must be set before seeding');
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!adminPassword || adminPassword.length < 12) throw new Error('SEED_ADMIN_PASSWORD must contain at least 12 characters before seeding');
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create Super Admin
    await db.insert(schema.users).values({
      id: 'usr_superadmin1',
      email: adminEmail,
      passwordHash: passwordHash,
      fullName: 'Mohamed Hassan',
      role: 'superadmin',
      status: 'Active',
      isVerified: true,
      firstLogin: false,
    }).onConflictDoNothing();

    console.log(`✅ Superadmin created: ${adminEmail}`);

    console.log('🎉 Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
