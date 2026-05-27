CREATE TABLE IF NOT EXISTS transition_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO transition_words (word, label) VALUES
  ('सृजन', 'creation'),
  ('दृष्टि', 'vision'),
  ('मौन', 'silence'),
  ('शिवम्', 'auspicious');
