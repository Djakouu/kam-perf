import * as fs from 'fs';
import * as path from 'path';

const DATA_FILE = 'analysis_history.csv';

interface AnalysisRecord {
  device: string;
  domain: string;
  url: string;
  history: { date: string; score: number }[];
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

function parseLine(line: string): AnalysisRecord | null {
  const parts = line.split('|');
  if (parts.length < 5) return null;

  const device = parts[0];
  const domain = parts[1];
  const url = parts[2];
  const history: { date: string; score: number }[] = [];

  // History comes in pairs: date|score
  for (let i = 3; i < parts.length; i += 2) {
    if (parts[i] && parts[i + 1]) {
      history.push({
        date: parts[i],
        score: parseFloat(parts[i + 1])
      });
    }
  }

  return { device, domain, url, history };
}

function formatRecord(record: AnalysisRecord): string {
  const historyString = record.history
    .map(h => `${h.date}|${h.score}`)
    .join('|');
  return `${record.device}|${record.domain}|${record.url}|${historyString}`;
}

export function storeResult(url: string, device: string, totalCpuTime: number) {
  const filePath = path.resolve(DATA_FILE);
  let records: AnalysisRecord[] = [];

  // Read existing file
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    records = content
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(parseLine)
      .filter((r): r is AnalysisRecord => r !== null);
  }

  const domain = getDomain(url);
  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Find existing record
  const existingRecordIndex = records.findIndex(
    r => r.url === url && r.device === device
  );

  if (existingRecordIndex !== -1) {
    // Update existing record
    records[existingRecordIndex].history.push({
      date: currentDate,
      score: totalCpuTime
    });
  } else {
    // Create new record
    records.push({
      device,
      domain,
      url,
      history: [{ date: currentDate, score: totalCpuTime }]
    });
  }

  // Write back to file
  const newContent = records.map(formatRecord).join('\n');
  fs.writeFileSync(filePath, newContent);
  console.error(`Analysis result stored in ${DATA_FILE}`);
}
