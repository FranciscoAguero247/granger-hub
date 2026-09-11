'use client';

import { useEffect, useRef, useState } from 'react';
import type { LiveFeedSnapshot, WardAnnouncement } from '@/types/announcements';

const FEED_CACHE_KEY = 'ward-feed-cache-v1';
const FEED_POLL_INTERVAL_MS = 45000;

type FeedStatus = 'connecting' | 'live' | 'polling';

const WARD_CONFIG = {
  wardName: 'Granger YSA Ward',
  stakeName: 'Taylorsville Utah YSA Stake',
  buildingAddress: '5065 W Janette Ave, West Valley City, UT 84120',
  mapsUrl: 'https://maps.google.com/?q=5065+W+Janette+Ave,+West+Valley+City,+UT+84120',
  schedule: {
    sacramentTime: '12:00 PM',
    secondHourTime: '1:10 PM',
    location: 'Stake Center Chapel',
  },
  links: {
    facebookGroup: 'https://www.facebook.com/groups/grangerysa',
    whatsappGroup: 'https://chat.whatsapp.com/YOUR_WHATSAPP_INVITE_CODE',
  },
  leadership: [
    {
      role: 'Ward Leadership',
      fbHandle: 'trisha.peck.959148',
    },
    {
      name: 'Relief Society',
      role: 'Presidency',
      fbHandle: '',
    },
  ],
};

function formatLastUpdated(isoDate: string | null): string {
  if (!isoDate) {
    return 'Waiting for first sync';
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Waiting for first sync';
  }

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function fetchFeed(etag: string | null): Promise<{
  snapshot: LiveFeedSnapshot | null;
  etag: string | null;
  notModified: boolean;
}> {
  const headers: HeadersInit = {};

  if (etag) {
    headers['If-None-Match'] = etag;
  }

  const response = await fetch('/api/feed', {
    cache: 'no-store',
    headers,
  });

  if (response.status === 304) {
    return {
      snapshot: null,
      etag,
      notModified: true,
    };
  }

  if (!response.ok) {
    throw new Error(`Feed request failed with status ${response.status}`);
  }

  const snapshot = (await response.json()) as LiveFeedSnapshot;

  return {
    snapshot,
    etag: response.headers.get('etag') || etag,
    notModified: false,
  };
}

export default function GrangerLauncher() {
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [announcements, setAnnouncements] = useState<WardAnnouncement[]>([]);
  const [activeFlyer, setActiveFlyer] = useState<{ url: string; title: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedStatus, setFeedStatus] = useState<FeedStatus>('connecting');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const etagRef = useRef<string | null>(null);
  const versionRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let eventSource: EventSource | null = null;
    let reconnectAttempts = 0;

    const applySnapshot = (snapshot: LiveFeedSnapshot) => {
      versionRef.current = snapshot.version;
      setAnnouncements(snapshot.announcements);
      setLastUpdatedAt(snapshot.updatedAt);

      try {
        localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(snapshot));
      } catch {
        // Ignore storage errors on restricted devices.
      }
    };

    const refreshFeed = async (showSpinner: boolean) => {
      if (!isMounted) {
        return;
      }

      if (showSpinner) {
        setIsRefreshing(true);
      }

      try {
        const { snapshot, etag } = await fetchFeed(etagRef.current);
        if (!isMounted) {
          return;
        }

        if (etag) {
          etagRef.current = etag;
        }

        if (snapshot) {
          applySnapshot(snapshot);
        }
      } catch (error) {
        console.error('Failed to refresh announcements feed:', error);
        if (isMounted) {
          setFeedStatus('polling');
        }
      } finally {
        if (showSpinner && isMounted) {
          setIsRefreshing(false);
        }
      }
    };

    const connectSse = () => {
      if (!isMounted) {
        return;
      }

      setFeedStatus('connecting');
      eventSource = new EventSource('/api/updates');

      eventSource.addEventListener('connected', () => {
        if (!isMounted) {
          return;
        }

        reconnectAttempts = 0;
        setFeedStatus('live');
      });

      eventSource.addEventListener('version', (event) => {
        if (!isMounted) {
          return;
        }

        setFeedStatus('live');
        const message = event as MessageEvent<string>;

        try {
          const payload = JSON.parse(message.data) as { version?: string };
          if (payload.version && payload.version !== versionRef.current) {
            void refreshFeed(true);
          }
        } catch (error) {
          console.error('Invalid version event payload:', error);
        }
      });

      eventSource.addEventListener('ping', () => {
        if (isMounted) {
          setFeedStatus('live');
        }
      });

      eventSource.onerror = () => {
        if (!isMounted) {
          return;
        }

        setFeedStatus('polling');

        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        reconnectAttempts += 1;
        const exponentialDelay = Math.min(30000, 1000 * 2 ** Math.min(reconnectAttempts, 5));
        const jitter = Math.floor(Math.random() * 500);
        reconnectTimer = setTimeout(connectSse, exponentialDelay + jitter);
      };
    };

    try {
      const cached = localStorage.getItem(FEED_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as LiveFeedSnapshot;
        if (parsed?.announcements && parsed?.version) {
          applySnapshot(parsed);
        }
      }
    } catch {
      // Ignore invalid cache payloads.
    }

    void refreshFeed(true);
    connectSse();

    const intervalId = setInterval(() => {
      void refreshFeed(false);
    }, FEED_POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200/80 flex items-center justify-center p-4 md:p-8 font-sans text-slate-900">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-indigo-600 text-white p-6 md:p-8 text-center relative">
          <span className="text-[10px] md:text-xs font-black tracking-widest uppercase bg-indigo-500 text-indigo-100 px-2.5 py-1 rounded-full border border-indigo-400">
            {WARD_CONFIG.stakeName}
          </span>
          <h1 className="text-2xl md:text-3xl font-black mt-3 tracking-tight">
            {WARD_CONFIG.wardName}
          </h1>
          <p className="text-xs md:text-sm text-indigo-100 mt-1">
            Official Communications Place
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 m-4 md:m-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              📢 Live Ward Announcements
            </h2>

            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-full border border-slate-200 shadow-xs">
              {isRefreshing ? (
                <>
                    <svg
                      className="animate-spin h-2.5 w-2.5 text-indigo-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span className="text-[9px] font-semibold text-indigo-600">Syncing...</span>
                  </>
                ) : feedStatus === 'connecting' ? (
                  <>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    <span className="text-[9px] font-semibold text-amber-600">Connecting...</span>
                  </>
                ) : feedStatus === 'polling' ? (
                  <>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    <span className="text-[9px] font-semibold text-orange-600">Polling Fallback</span>
                  </>
                ) : (
                  <>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] font-semibold text-slate-500">Live</span>
                  </>
                )}
              </div>
          </div>

          <p className="text-[10px] text-slate-400">
            Last update: {formatLastUpdated(lastUpdatedAt)}
          </p>

          <div className="space-y-3">
            {announcements.length > 0 ? (
              announcements.map((item, index) => (
                <div
                  key={`${item.title}-${item.date}-${item.ImageURL || 'no-image'}-${index}`}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2 overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                      {item.category}
                    </span>
                    {item.date && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {item.date}
                      </span>
                    )}
                  </div>

                  {item.title && (
                    <h3 className="text-xs font-bold text-slate-800">{item.title}</h3>
                  )}

                  {item.ImageURL && (
                    <button
                      type="button"
                      onClick={() => setActiveFlyer({ url: item.ImageURL!, title: item.title })}
                      className="group relative w-full rounded-lg overflow-hidden border border-slate-200 my-2 bg-slate-100 block text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <img
                        src={item.ImageURL}
                        alt={item.title || 'Event Flyer'}
                        className="w-full h-auto object-cover max-h-96 rounded-lg group-hover:scale-[1.01] transition-transform duration-200"
                        loading="lazy"
                      />
                      <span className="absolute bottom-2 right-2 bg-slate-900/75 text-white text-[10px] font-medium px-2 py-1 rounded-md backdrop-blur-sm opacity-90 group-hover:opacity-100 transition-opacity">
                        🔍 Tap to expand
                      </span>
                    </button>
                  )}

                  {item.details && (
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {item.details}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-3">
                No active announcements right now.
              </p>
            )}
          </div>
        </div>

        <div className="p-5 md:p-7 lg:p-8 grid gap-6 md:grid-cols-2 md:items-start pt-0">
          <section className="space-y-4 md:space-y-5">
            <div className="bg-slate-50 p-4 md:p-5 rounded-xl border border-slate-200/80">
              <h2 className="text-[11px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">
                Sunday Schedule
              </h2>
              <div className="mt-2 flex justify-between items-center text-sm md:text-base font-bold text-slate-800">
                <span>Sacrament Meeting</span>
                <span className="text-indigo-600">
                  {WARD_CONFIG.schedule.sacramentTime}
                </span>
              </div>
              <div className="mt-1.5 flex justify-between items-center text-xs md:text-sm text-slate-600 border-t border-slate-200/60 pt-2">
                <span>EQ & Relief Society</span>
                <span className="font-semibold">
                  {WARD_CONFIG.schedule.secondHourTime}
                </span>
              </div>
              <a
                href={WARD_CONFIG.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs md:text-sm text-indigo-600 font-bold hover:underline"
              >
                <span>📍 {WARD_CONFIG.schedule.location}</span>
                <span className="text-[10px]">↗</span>
              </a>
              <p className="mt-2 text-[11px] md:text-xs text-slate-500">
                {WARD_CONFIG.buildingAddress}
              </p>
            </div>

            <button
              onClick={() => setShowPwaModal(true)}
              className="w-full py-2.5 md:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs md:text-sm font-bold rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <span>📱 Add to Home Screen</span>
            </button>
          </section>

          <section className="space-y-4 md:space-y-5">
            <div className="space-y-2.5">
              <h2 className="text-[11px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">
                Official Channels
              </h2>

              <a
                href={WARD_CONFIG.links.facebookGroup}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full h-14 md:h-16 px-4 md:px-5 bg-[#1877F2] hover:bg-blue-700 text-white rounded-xl font-bold text-sm md:text-base shadow-sm transition active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 fill-current"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook Group</span>
                </div>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-white font-medium">
                  Open App ↗
                </span>
              </a>

              <a
                href={WARD_CONFIG.links.whatsappGroup}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full h-14 md:h-16 px-4 md:px-5 bg-[#25D366] hover:bg-emerald-600 text-white rounded-xl font-bold text-sm md:text-base shadow-sm transition active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 fill-current"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                  </svg>
                  <span>WhatsApp Group</span>
                </div>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-white font-medium">
                  Join ↗
                </span>
              </a>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <h2 className="text-[11px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Direct Contact
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                {WARD_CONFIG.leadership.map((leader, i) => (
                  <a
                    key={`${leader.role}-${i}`}
                    href={
                      leader.fbHandle
                        ? `https://m.me/${leader.fbHandle}`
                        : WARD_CONFIG.links.facebookGroup
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 md:p-3 bg-slate-50 border border-slate-200 rounded-lg text-center block hover:bg-slate-100 transition"
                  >
                    <p className="text-xs md:text-sm font-bold text-slate-800">
                      {leader.role}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] md:text-xs text-slate-400">
          Granger YSA • Zero Sign-up Web Hub
        </div>
      </div>

      {activeFlyer && (
        <div
          onClick={() => setActiveFlyer(null)}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center justify-center cursor-default"
          >
            <button
              onClick={() => setActiveFlyer(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1"
            >
              ✕ Close
            </button>
            <img
              src={activeFlyer.url}
              alt={activeFlyer.title || 'Event Flyer'}
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-slate-700/50"
            />
            {activeFlyer.title && (
              <p className="text-xs font-medium text-slate-300 mt-3 text-center">
                {activeFlyer.title}
              </p>
            )}
          </div>
        </div>
      )}

      {showPwaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Add to Phone Home Screen
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Save this page as a web app icon on your phone so you can launch Facebook
              and WhatsApp in 1 tap:
            </p>
            <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-2 text-slate-700">
              <p>
                <strong>iPhone (Safari):</strong> Tap{' '}
                <span className="text-indigo-600">Share ⎋</span> → Select{' '}
                <strong>Add to Home Screen ➕</strong>
              </p>
              <p>
                <strong>Android (Chrome):</strong> Tap{' '}
                <span className="text-indigo-600">More ⋮</span> → Select{' '}
                <strong>Add to Home screen</strong>
              </p>
            </div>
            <button
              onClick={() => setShowPwaModal(false)}
              className="w-full py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  );
}