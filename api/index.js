import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import reportRoutes from './routes/reports.js';
import userRoutes from './routes/users.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (_, res) => res.json({ ok: true }));

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

export default app;
