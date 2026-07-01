import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from './models/User.js';

await mongoose.connect(process.env.MONGODB_URI);

const users = [
  { name: 'Admin', email: 'admin@kastwel.com', password: 'admin123', role: 'admin' },
  { name: 'Worker', email: 'production@kastwel.com', password: 'worker123', role: 'worker' },
];

for (const u of users) {
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
