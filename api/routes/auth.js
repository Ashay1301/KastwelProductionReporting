import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    await connectDB();
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token' });
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    await connectDB();
    const user = await User.findById(payload.id).select('-passwordHash');
    if (!user || !user.isActive) return res.status(401).json({ message: 'User not found' });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
});

export default router;
