import { LiveFeedSnapshot, WardAnnouncement } from '@/types/announcements';
import { getSheetUrl } from '@/lib/site-config';

const FALLBACK_ANNOUNCEMENTS: WardAnnouncement[] = [
  {
    title: 'Connect your Google Sheet',
    details: 'Use the admin panel on the homepage to paste your published CSV link and start showing live ward announcements.',
    date: 'Setup needed',
    category: 'Setup',
  },
];

let lastSnapshot: LiveFeedSnapshot | null = null;

const ALLOWED_IMAGE_HOSTS = new Set([
  'drive.google.com',
  'docs.google.com',
  'lh3.googleusercontent.com',
  'i.postimg.cc',
]);

const IMAGE_FILE_EXTENSION_REGEX = /\.(png|jpe?g|webp|gif|avif|svg)$/i;

function normalizeImageUrl(url: string): string {
  if (!url) return '';

  const trimmed = url.trim();

  if (!trimmed || trimmed.includes('<') || trimmed.includes('object==typeof global')) {
    return '';
  }

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    return '';
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return '';
  }

  if (parsed.hostname === 'postimg.cc') {
    // postimg.cc links are HTML landing pages, not direct image files.
    return '';
  }

  if (trimmed.includes('drive.google.com') && trimmed.includes('/d/')) {
    const fileIdMatch = trimmed.match(/\/d\/([^/]+)/);
    if (fileIdMatch?.[1]) {
      return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
    }
  }

  if (!ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) {
    return '';
  }

  if (parsed.hostname === 'i.postimg.cc' && !IMAGE_FILE_EXTENSION_REGEX.test(parsed.pathname)) {
    return '';
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
      const rawImageUrl = cols[4] || '';
      const imageUrl = normalizeImageUrl(rawImageUrl);
      const rawTitle = cols[0] || '';
      const hasRejectedImageUrl = rawImageUrl.trim() !== '' && imageUrl === '';

      return {
        title: rawTitle || (imageUrl ? 'Event Flyer' : ''),
        details: cols[1] || '',
        date: cols[2] || '',
        category: cols[3] || 'Flyer',
        ImageURL: imageUrl,
        imageWarning: hasRejectedImageUrl
          ? 'Image link was rejected. Use a direct image URL such as Google Drive raw image links or i.postimg.cc image files.'
          : undefined,
      };
    })
    .filter((item) => item.title || item.details || item.ImageURL || item.imageWarning);
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
  const csvUrl = await getSheetUrl();

  if (!csvUrl) {
    return createSnapshot(FALLBACK_ANNOUNCEMENTS, 'fallback');
  }

  try {
    const response = await fetch(csvUrl, {
      next: { revalidate: 15 },
    });

    if (!response.ok) {
      throw new Error(`Google Sheets fetch failed with status ${response.status}`);
    }

    const csvText = await response.text();
    const normalizedStart = csvText.trimStart().toLowerCase();

    if (normalizedStart.startsWith('<!doctype html') || normalizedStart.startsWith('<html')) {
      throw new Error('Configured sheet URL returned HTML instead of CSV. Use the published CSV link.');
    }

    const announcements = normalizeAnnouncements(csvText);

    return createSnapshot(announcements, 'live');
  } catch (error) {
    console.error('Failed to load announcements from Google Sheets:', error);
    return createSnapshot(FALLBACK_ANNOUNCEMENTS, 'fallback');
  }
}
