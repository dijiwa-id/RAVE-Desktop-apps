// Kontrak API RAVE (gateway /v1) yang dipakai desktop — subset dari apps/web/src/lib/types.ts.

export interface Me {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  locale?: 'id' | 'en' | null;
  roles: string[];
  premium: boolean;
}
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: Me;
}

export interface ArtistRef {
  id: string;
  name: string;
  slug: string;
}
export interface Track {
  id: string;
  title: string;
  duration_ms: number;
  explicit: boolean;
  track_number: number;
  play_count: number;
  has_lyrics: boolean;
  artist: ArtistRef;
  release: { id: string; title: string; cover_url: string | null };
}
export interface ArtistSummary {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
  city: string | null;
  genres: string[];
  verified: boolean;
  monthly_listeners: number;
}
export interface ArtistLink {
  platform: string;
  url: string;
}
export interface Artist extends ArtistSummary {
  bio: string | null;
  cover_url: string | null;
  followers: number;
  links?: ArtistLink[];
  top_tracks: Track[];
  releases: ReleaseSummary[];
}
export interface ReleaseSummary {
  id: string;
  title: string;
  type: 'SINGLE' | 'EP' | 'ALBUM';
  cover_url: string | null;
  release_date: string;
  artist: ArtistRef;
}
export interface Release extends ReleaseSummary {
  label: string | null;
  genre: string | null;
  explicit: boolean;
  tracks: Track[];
}
export interface PlaylistSummary {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  owner: { id: string; display_name?: string; name?: string } | null;
  visibility: string;
  track_count: number;
  is_editorial: boolean;
}
export interface Playlist extends PlaylistSummary {
  items: { item_id: string; added_at: string; track: Track }[];
}
export interface Episode {
  id: string;
  show_id: string;
  title: string;
  description: string | null;
  duration_ms: number;
  published_at: string;
  is_premium: boolean;
  cover_url: string | null;
}
export interface Show {
  id: string;
  kind: 'PODCAST' | 'FICTION';
  title: string;
  publisher: string;
  description: string;
  cover_url: string | null;
  category: string;
  content_warning?: boolean;
  episodes?: Episode[];
}

/** Kartu beranda (quick picks & rak). */
export interface MediaItem {
  id: string;
  kind: 'release' | 'artist' | 'playlist' | 'show' | 'episode' | 'track';
  title: string;
  subtitle: string;
  image_url: string | null;
  href: string;
}
export interface Home {
  quick_picks: MediaItem[];
  sections: { id: string; title: string; kind: string; items: MediaItem[] }[];
}
export interface SearchResult {
  artists: ArtistSummary[];
  tracks: Track[];
  releases: ReleaseSummary[];
  shows: Show[];
  episodes: Episode[];
}
export interface LibrarySummary {
  liked_count: number;
  playlists: PlaylistSummary[];
  followed_artists: string[];
  saved_releases: string[];
  recent_track_ids: string[];
}
export interface Lyrics {
  synced: boolean;
  lines: { time_ms: number; text: string }[];
}

export interface PlaybackSession {
  session_id: string;
  stream_url: string;
  expires_at: string;
  quality: string;
  codec_label: string;
  quality_capped?: 'premium' | 'preview' | 'disabled' | 'unavailable' | null;
  preview_only: boolean;
  preview_ms: number | null;
  duration_ms: number;
}

export interface AdCreative {
  impression_id: string;
  type: 'audio' | 'display' | string;
  advertiser: string;
  title: string;
  body: string | null;
  image_url: string | null;
  audio_url: string | null;
  click_url: string | null;
  cta_label: string | null;
  theme_color: string | null;
  duration_s: number;
  skippable_after_s: number | null;
}
export interface AdBreakResponse {
  break_id: string | null;
  ads: AdCreative[];
}
