import * as XLSX from 'xlsx';

const FURNACE_LABELS = { A: 'A (500kg)', B: 'B (500kg)', A2: 'A2 (1000kg)', B2: 'B2 (1000kg)', C2: 'C2 (500kg)' };

function reportToRows(r) {
  const tavs = r.tavs || [];
  if (tavs.length === 0) {
    return [{
      'Submission ID': r.submissionId,
      'Date': r.date ? new Date(r.date).toLocaleDateString() : '',
      'Shift': r.shift,
      'Furnace': '',
      'Seq #': '',
      'Operator': '',
      'Grade': '',
      'Final Weight (kg)': '',
      'Start Time': '',
      'End Time': '',
      'Energy Meter Reading': '',
      'Temperature (°C)': '',
      'Logged By': '',
    }];
  }
  return tavs.map((t, i) => ({
    'Submission ID': i === 0 ? r.submissionId : '',
    'Date': i === 0 ? (r.date ? new Date(r.date).toLocaleDateString() : '') : '',
    'Shift': i === 0 ? r.shift : '',
    'Furnace': FURNACE_LABELS[t.furnaceId] || t.furnaceId || '',
    'Seq #': t.seqNo || i + 1,
    'Operator': t.operator || '',
    'Grade': t.grade || '',
    'Final Weight (kg)': t.finalWeight ?? '',
    'Start Time': t.startTime || '',
    'End Time': t.endTime || '',
    'Energy Meter Reading': t.energyMeterReading ?? '',
    'Temperature (°C)': t.temperature ?? '',
    'Logged By': t.loggedBy || '',
  }));
}

function download(wb, filename) {
  XLSX.writeFile(wb, filename);
}

export function exportSingleReport(report) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(reportToRows(report));
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  download(wb, `Report-${report.submissionId}.xlsx`);
}

export function exportBulkReports(reports, label = 'Export') {
  const wb = XLSX.utils.book_new();
  const rows = reports.flatMap(reportToRows);
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Reports');
  download(wb, `Reports-${label}.xlsx`);
}
