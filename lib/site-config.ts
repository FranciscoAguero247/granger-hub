import { promises as fs } from 'fs';
import path from 'path';

export interface SiteConfig {
  sheetUrl?: string;
  updatedAt?: string;
}

const SITE_CONFIG_PATH = path.join(process.cwd(), '.data', 'site-config.json');

function normalizePublishedCsvUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    throw new Error('Sheet URL cannot be empty');
  }

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Enter a valid URL that starts with https://');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Google Sheets URL must start with https://');
  }

  if (parsed.hostname !== 'docs.google.com') {
    throw new Error('Use a published Google Sheets link from docs.google.com');
  }

  if (parsed.pathname.includes('/edit')) {
    throw new Error('This looks like an edit link. Use File > Share > Publish to web, then copy the CSV link.');
  }

  if (parsed.pathname.endsWith('/pubhtml')) {
    parsed.pathname = parsed.pathname.replace(/\/pubhtml$/, '/pub');
  }

  if (!parsed.pathname.includes('/pub')) {
    throw new Error('Use a published Google Sheets URL (it should include /pub or /pubhtml).');
  }

  parsed.searchParams.set('output', 'csv');

  return parsed.toString();
}

async function readSiteConfigFile(): Promise<SiteConfig | null> {
  try {
    const fileText = await fs.readFile(SITE_CONFIG_PATH, 'utf8');
    return JSON.parse(fileText) as SiteConfig;
  } catch {
    return null;
  }
}

export async function getSiteConfig(): Promise<SiteConfig> {
  const fileConfig = await readSiteConfigFile();

  return fileConfig ?? {};
}

export async function getSheetUrl(): Promise<string | null> {
  const fileConfig = await readSiteConfigFile();
  const configuredUrl = fileConfig?.sheetUrl?.trim();

  if (configuredUrl) {
    try {
      return normalizePublishedCsvUrl(configuredUrl);
    } catch {
      return configuredUrl;
    }
  }

  const envUrl = process.env.GOOGLE_SHEET_CSV_URL?.trim();
  if (!envUrl) {
    return null;
  }

  try {
    return normalizePublishedCsvUrl(envUrl);
  } catch {
    return envUrl;
  }
}

export async function saveSheetUrl(sheetUrl: string): Promise<SiteConfig> {
  const normalizedUrl = normalizePublishedCsvUrl(sheetUrl);

  const nextConfig: SiteConfig = {
    sheetUrl: normalizedUrl,
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(SITE_CONFIG_PATH), { recursive: true });
  await fs.writeFile(SITE_CONFIG_PATH, JSON.stringify(nextConfig, null, 2), 'utf8');

  return nextConfig;
}