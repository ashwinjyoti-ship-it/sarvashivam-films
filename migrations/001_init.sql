CREATE TABLE IF NOT EXISTS films (
  slot INTEGER PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'short-film',
  tone TEXT,
  video_type TEXT,
  video_url TEXT
);

CREATE TABLE IF NOT EXISTS admin_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO admin_config (key, value) VALUES ('password', 'BHAVYA');

INSERT OR IGNORE INTO films (slot, title, description, category, tone) VALUES
  (1, 'KAAFIR', 'A moral fracture rendered in stillness, dusk, and withheld revelation.', 'short-film', 'warm'),
  (2, 'VANVAAS', 'Departure, exile, and longing translated through sonic memory and image.', 'music-video', 'silver'),
  (3, 'MONOLOGUE', 'A voice-led identity piece where intimacy becomes the visual architecture.', 'brand-film', 'earth'),
  (4, 'AAINA', 'A film of reflection, self-recognition, and the unease of being seen.', 'short-film', null),
  (5, 'SIYA', 'A feminine interiority piece shaped through restraint, rhythm, and light.', 'brand-film', 'warm');
