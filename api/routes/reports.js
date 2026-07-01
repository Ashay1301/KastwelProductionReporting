import { Router } from 'express';
import { nanoid } from 'nanoid';
import { connectDB } from '../config/db.js';
import Report from '../models/Report.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

function dateToId(date, shift) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const s = shift === '1st Shift' ? '1S' : '2S';
  return `KPR-${y}${m}${day}-${s}`;
}

// GET /api/reports/stats/today
router.get('/stats/today', verifyToken, async (req, res) => {
  try {
    await connectDB();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const reports = await Report.find({ date: { $gte: today, $lt: tomorrow } }).lean();
    const allTavs = reports.flatMap((r) => r.tavs || []);

    const furnaceIds = ['A', 'B', 'A2', 'B2', 'C2'];
    const byFurnace = furnaceIds.map((id) => {
      const tavs = allTavs.filter((t) => t.furnaceId === id);
      return {
        furnaceId: id,
        count: tavs.length,
        totalWeight: tavs.reduce((s, t) => s + (t.finalWeight || 0), 0),
      };
    }).filter((f) => f.count > 0);

    res.json({
      totalTavs: allTavs.length,
      totalWeight: allTavs.reduce((s, t) => s + (t.finalWeight || 0), 0),
      byFurnace,
      reports: reports.map((r) => ({ _id: r._id, submissionId: r.submissionId, shift: r.shift, tavCount: r.tavs.length })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

// GET /api/reports
router.get('/', verifyToken, async (req, res) => {
  try {
    await connectDB();
    const { from, to, shift, furnace } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }
    if (shift) filter.shift = shift;

    let reports = await Report.find(filter).sort({ date: -1, createdAt: -1 }).lean();

    if (furnace) {
      reports = reports.map((r) => ({
        ...r,
        tavs: (r.tavs || []).filter((t) => t.furnaceId === furnace),
      })).filter((r) => r.tavs.length > 0);
    }

    const summary = reports.map((r) => ({
      _id: r._id,
      submissionId: r.submissionId,
      date: r.date,
      shift: r.shift,
      tavCount: r.tavs.length,
      totalWeight: r.tavs.reduce((s, t) => s + (t.finalWeight || 0), 0),
      createdAt: r.createdAt,
    }));

    res.json({ reports: summary });
  } catch {
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
});

// GET /api/reports/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    await connectDB();
    const report = await Report.findById(req.params.id).lean();
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json({ report });
  } catch {
    res.status(500).json({ message: 'Failed to fetch report' });
  }
});

// POST /api/reports/tav — log a single charge (upserts report for date+shift)
router.post('/tav', verifyToken, async (req, res) => {
  try {
    await connectDB();
    const { date, shift, furnaceId, operator, grade, finalWeight, startTime, endTime, energyMeterReading, temperature } = req.body;

    if (!date || !shift || !furnaceId) {
      return res.status(400).json({ message: 'date, shift, and furnaceId are required' });
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    let report = await Report.findOne({ date: { $gte: dayStart, $lte: dayEnd }, shift });

    if (!report) {
      report = new Report({
        submissionId: dateToId(date, shift),
        date: dayStart,
        shift,
        tavs: [],
      });
    }

    const seqNo = (report.tavs || []).filter((t) => t.furnaceId === furnaceId).length + 1;

    report.tavs.push({
      furnaceId,
      operator: operator || '',
      grade: grade || '',
      finalWeight: finalWeight != null ? Number(finalWeight) : undefined,
      startTime: startTime || '',
      endTime: endTime || '',
      energyMeterReading: energyMeterReading != null ? Number(energyMeterReading) : undefined,
      temperature: temperature != null ? Number(temperature) : undefined,
      loggedBy: req.user.name,
      seqNo,
    });

    await report.save();
    res.status(201).json({ report });
  } catch (err) {
    res.status(500).json({ message: 'Failed to log charge', error: err.message });
  }
});

// PUT /api/reports/:id — admin: replace tavs array / update remarks
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    await connectDB();
    const { tavs, remarks } = req.body;
    const updates = {};
    if (tavs !== undefined) updates.tavs = tavs;
    if (remarks !== undefined) updates.remarks = remarks;
    const report = await Report.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json({ report });
  } catch {
    res.status(500).json({ message: 'Failed to update report' });
  }
});

// DELETE /api/reports/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await connectDB();
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ message: 'Failed to delete report' });
  }
});

export default router;
