import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    await connectDB();
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 }).lean();
    res.json({ users });
  } catch {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    await connectDB();
    const { name, email, password, role = 'worker' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role });
    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create user', error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    await connectDB();
    const { name, email, role, isActive, password } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email.toLowerCase();
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    if (password) updates.passwordHash = await bcrypt.hash(password, 12);
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch {
    res.status(500).json({ message: 'Failed to update user' });
  }
});

export default router;
