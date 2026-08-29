CREATE TABLE IF NOT EXISTS artist_genre_cache (
  artist_name TEXT PRIMARY KEY,
  genres TEXT[] NOT NULL DEFAULT '{}',
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
