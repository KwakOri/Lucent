-- Add missing fields to projects table
-- release_date: 프로젝트 발매일
-- external_links: YouTube, Spotify 등 외부 링크

ALTER TABLE projects
ADD COLUMN release_date DATE,
ADD COLUMN external_links JSONB;

-- external_links 예시:
-- {
--   "youtube": "https://youtube.com/...",
--   "spotify": "https://open.spotify.com/...",
--   "other": "https://..."
-- }
