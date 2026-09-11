import { getSiteConfig, saveSheetUrl } from '@/lib/site-config';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const config = await getSiteConfig();

  return Response.json({
    sheetUrl: config.sheetUrl ?? '',
    hasSheetUrl: Boolean(config.sheetUrl),
    updatedAt: config.updatedAt ?? null,
  });
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { sheetUrl?: string } | null;
  const sheetUrl = body?.sheetUrl?.trim();

  if (!sheetUrl) {
    return Response.json(
      { error: 'sheetUrl is required' },
      { status: 400 },
    );
  }

  try {
    const config = await saveSheetUrl(sheetUrl);

    return Response.json({
      sheetUrl: config.sheetUrl ?? '',
      hasSheetUrl: Boolean(config.sheetUrl),
      updatedAt: config.updatedAt ?? null,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unable to save sheet URL',
      },
      { status: 500 },
    );
  }
}