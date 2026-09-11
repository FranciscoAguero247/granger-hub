import { fetchLiveFeedSnapshot } from '@/lib/announcements';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  const snapshot = await fetchLiveFeedSnapshot();
  const etag = `W/\"${snapshot.version}\"`;

  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': 'public, max-age=0, s-maxage=15, stale-while-revalidate=60',
      },
    });
  }

  return Response.json(snapshot, {
    headers: {
      ETag: etag,
      'Cache-Control': 'public, max-age=0, s-maxage=15, stale-while-revalidate=60',
    },
  });
}
