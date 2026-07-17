import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from './models/User.js';

await mongoose.connect(process.env.MONGODB_URI);

const users = [
  { name: 'Admin', email: 'admin@kastwel.com', password: process.env.SEED_ADMIN_PASSWORD, role: 'admin' },
  { name: 'Worker', email: 'production@kastwel.com', password: process.env.SEED_WORKER_PASSWORD, role: 'worker' },
];

for (const u of users) {
  if (!u.password || u.password.length < 12) {
    console.error(`Refusing to seed ${u.email}: set a strong SEED_*_PASSWORD env var (min 12 chars).`);
    process.exit(1);
  }
  const existing = await User.findOne({ email: u.email });
  if (existing) {
    console.log(`Already exists: ${u.email}`);
    continue;
  }
  await User.create({ name: u.name, email: u.email, passwordHash: await bcrypt.hash(u.password, 12), role: u.role });
  console.log(`Created: ${u.email} (${u.role})`);
}

await mongoose.disconnect();
console.log('Done');
