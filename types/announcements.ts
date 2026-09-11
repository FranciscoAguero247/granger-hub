export interface WardAnnouncement {
  title: string;
  details: string;
  date: string;
  category: string;
  ImageURL?: string;
  imageWarning?: string;
}

export interface LiveFeedSnapshot {
  announcements: WardAnnouncement[];
  version: string;
  updatedAt: string;
  source: 'live' | 'fallback';
}
