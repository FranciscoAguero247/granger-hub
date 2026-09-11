import { LiveFeedSnapshot, WardAnnouncement } from '@/types/announcements';

const FALLBACK_ANNOUNCEMENTS: WardAnnouncement[] = [
  {
    title: 'Weekly FHE',
    details: "Check WhatsApp group for this week's location!",
    date: 'Every Monday @ 7:00 PM',
    category: 'FHE',
  },
];

let lastSnapshot: LiveFeedSnapshot | null = null;

function normalizeImageUrl(url: string): string {
  if (!url) return '';

  const trimmed = url.trim();

  if (trimmed.includes('drive.google.com') && trimmed.includes('/d/')) {
    const fileIdMatch = trimmed.match(/\/d\/([^/]+)/);
    if (fileIdMatch?.[1]) {
      return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
    }
  }

  return trimmed;
}

function parseCSVRow(rowText: string): string[] {
  const result: string[] = [];
  let currentToken = '';
  let insideQuotes = false;

  for (let i = 0; i < rowText.length; i++) {
    const char = rowText[i];

    if (char === '"') {
      if (insideQuotes && rowText[i + 1] === '"') {
        currentToken += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(currentToken.trim());
      currentToken = '';
    } else {
      currentToken += char;
    }
  }

  result.push(currentToken.trim());
  return result;
}

function versionHash(input: string): string {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function normalizeAnnouncements(csvText: string): WardAnnouncement[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length <= 1) {
    return [];
  }

  return lines
    .slice(1)
    .map((line) => {
      const cols = parseCSVRow(line);
      const imageUrl = normalizeImageUrl(cols[4] || '');
      const rawTitle = cols[0] || '';

      return {
        title: rawTitle || (imageUrl ? 'Event Flyer' : ''),
        details: cols[1] || '',
        date: cols[2] || '',
        category: cols[3] || 'Flyer',
        ImageURL: imageUrl,
      };
    })
    .filter((item) => item.title || item.details || item.ImageURL);
}

function createSnapshot(announcements: WardAnnouncement[], source: 'live' | 'fallback'): LiveFeedSnapshot {
  const payload = JSON.stringify(announcements);
  const version = versionHash(payload);

  if (lastSnapshot && lastSnapshot.version === version && lastSnapshot.source === source) {
    return lastSnapshot;
  }

  const snapshot: LiveFeedSnapshot = {
    announcements,
    version,
    updatedAt: new Date().toISOString(),
    source,
  };

  lastSnapshot = snapshot;
  return snapshot;
}

export async function fetchLiveFeedSnapshot(): Promise<LiveFeedSnapshot> {
  const csvUrl = process.env.GOOGLE_SHEET_CSV_URL;

  if (!csvUrl) {
    throw new Error('Missing GOOGLE_SHEET_CSV_URL environment variable');
  }

  try {
    const response = await fetch(csvUrl, {
      next: { revalidate: 15 },
    });

    if (!response.ok) {
      throw new Error(`Google Sheets fetch failed with status ${response.status}`);
    }

    const csvText = await response.text();
    const announcements = normalizeAnnouncements(csvText);

    return createSnapshot(announcements, 'live');
  } catch (error) {
    console.error('Failed to load announcements from Google Sheets:', error);
    return createSnapshot(FALLBACK_ANNOUNCEMENTS, 'fallback');
  }
}
