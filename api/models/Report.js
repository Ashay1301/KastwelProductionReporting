import mongoose from 'mongoose';

const tavSchema = new mongoose.Schema({
  furnaceId: { type: String, trim: true },
  operator: { type: String, trim: true },
  grade: { type: String, trim: true },
  lotNo: { type: String, trim: true },
  finalWeight: { type: Number },
  startTime: { type: String, trim: true },
  endTime: { type: String, trim: true },
  energyMeterReading: { type: Number },
  temperature: { type: Number },
  loggedBy: { type: String, trim: true },
  seqNo: { type: Number },
});

const reportSchema = new mongoose.Schema(
  {
    submissionId: { type: String, required: true, unique: true },
    date: { type: Date, required: true },
    shift: { type: String, enum: ['1st Shift', '2nd Shift'], required: true },
    tavs: [tavSchema],
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model('Report', reportSchema);
