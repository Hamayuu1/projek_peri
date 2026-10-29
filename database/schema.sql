-- Skema database modul rekomendasi PERI (untuk integrasi dengan backend kelompok).
CREATE TABLE programs (
  id INTEGER PRIMARY KEY, name VARCHAR(150) NOT NULL, description TEXT, target TEXT,
  objective TEXT, output TEXT, period VARCHAR(80), category VARCHAR(80),
  criteria JSON NOT NULL            -- { age:[], employment:[], economic:[], interests:[], goals:[] }
);
CREATE TABLE participant_profiles (
  id INTEGER PRIMARY KEY, age INT NOT NULL, employment_status VARCHAR(40) NOT NULL,
  economic_condition VARCHAR(40) NOT NULL, interests JSON NOT NULL, goals JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE recommendations (
  id INTEGER PRIMARY KEY, participant_id INT REFERENCES participant_profiles(id),
  program_id INT REFERENCES programs(id), method VARCHAR(20) NOT NULL CHECK (method IN ('cosine','euclidean')),
  score DECIMAL(6,4) NOT NULL, rank INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE ground_truth (
  id INTEGER PRIMARY KEY, participant_id INT REFERENCES participant_profiles(id),
  program_id INT REFERENCES programs(id), admin_rating INT NOT NULL CHECK (admin_rating BETWEEN 0 AND 3),
  rated_by VARCHAR(80), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE evaluation_runs (
  id INTEGER PRIMARY KEY, method VARCHAR(20), n INT, precision_value DECIMAL(6,4),
  num_profiles INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
