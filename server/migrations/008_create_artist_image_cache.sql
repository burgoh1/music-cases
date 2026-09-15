CREATE TABLE IF NOT EXISTS artist_image_cache (
  artist_id TEXT PRIMARY KEY,
  image_url TEXT,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
