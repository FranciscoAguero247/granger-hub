import { fetchLiveFeedSnapshot } from '@/lib/announcements';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const encoder = new TextEncoder();

function sseEvent(eventName: string, payload: unknown): Uint8Array {
  return encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
}

export async function GET(): Promise<Response> {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastVersion = '';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (eventName: string, payload: unknown) => {
        controller.enqueue(sseEvent(eventName, payload));
      };

      const tick = async () => {
        if (!active) {
          return;
        }

        try {
          const snapshot = await fetchLiveFeedSnapshot();

          if (snapshot.version !== lastVersion) {
            lastVersion = snapshot.version;
            send('version', {
              version: snapshot.version,
              updatedAt: snapshot.updatedAt,
            });
          } else {
            send('ping', { t: Date.now() });
          }
        } catch (error) {
          send('error', {
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        if (active) {
          timer = setTimeout(tick, 15000);
        }
      };

      send('connected', { ok: true });
      await tick();
    },
    cancel() {
      active = false;
      if (timer) {
        clearTimeout(timer);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
