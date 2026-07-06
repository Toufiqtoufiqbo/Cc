import Database from "better-sqlite3";
import path from "path";

// In a real enterprise system, this would use a connection pool and PostgreSQL (e.g., via Prisma or Drizzle)
// For this environment, we maintain SQLite but wrap it in an enterprise-ready interface
const dbPath = path.resolve(process.cwd(), "traffic_enterprise.db");
export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL"); // Better performance for WAL

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS cameras (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    lat REAL,
    lng REAL,
    status TEXT DEFAULT 'online',
    fps INTEGER DEFAULT 30,
    resolution TEXT DEFAULT '1080p',
    created_at REAL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS iot_sensors (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    location TEXT NOT NULL,
    lat REAL,
    lng REAL,
    status TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER,
    vehicle_type TEXT,
    speed_kmh REAL,
    direction TEXT,
    violation INTEGER,
    timestamp REAL,
    camera_id TEXT DEFAULT 'CAM-01',
    confidence REAL DEFAULT 0.9,
    lane_id INTEGER DEFAULT 1,
    weather_condition TEXT DEFAULT 'clear',
    plate_number TEXT,
    color TEXT,
    make TEXT,
    model TEXT,
    FOREIGN KEY(camera_id) REFERENCES cameras(id)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp REAL,
    resolved INTEGER DEFAULT 0,
    camera_id TEXT,
    assigned_to TEXT,
    ticket_id TEXT,
    FOREIGN KEY(camera_id) REFERENCES cameras(id)
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
  CREATE INDEX IF NOT EXISTS idx_events_camera ON events(camera_id);
  CREATE INDEX IF NOT EXISTS idx_events_violation ON events(violation);
  CREATE INDEX IF NOT EXISTS idx_events_vehicle_type ON events(vehicle_type);
  CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
`);

// Seed cameras if empty
const camCount = db.prepare("SELECT COUNT(*) as c FROM cameras").get() as { c: number };
if (camCount.c === 0) {
  const insertCam = db.prepare("INSERT INTO cameras (id, name, location, lat, lng) VALUES (?, ?, ?, ?, ?)");
  const seedCameras = [
    ['CAM-01', 'Junction 14 - North', 'El Djazair Ave', 36.752887, 3.042048],
    ['CAM-02', 'Junction 14 - South', 'El Djazair Ave', 36.752500, 3.042200],
    ['CAM-03', 'Highway A1 - Exit 4', 'Route de la Corniche', 36.760000, 3.050000],
    ['CAM-04', 'City Center Square', "Rue de l'Indépendance", 36.770000, 3.060000],
    ['CAM-05', 'Industrial Park Entry', 'Zone Industrielle', 36.740000, 3.030000],
    ['CAM-06', 'Airport Roadway', "Route de l'Aéroport", 36.720000, 3.080000],
  ];
  db.transaction(() => {
    for (const cam of seedCameras) insertCam.run(...cam);
  })();
}

// Upgrade schema with additional production columns if they do not exist
const schemaUpgrades = [
  "ALTER TABLE cameras ADD COLUMN rtsp_url TEXT",
  "ALTER TABLE cameras ADD COLUMN stream_url TEXT",
  "ALTER TABLE cameras ADD COLUMN recording_status TEXT DEFAULT 'idle'",
  "ALTER TABLE cameras ADD COLUMN fps_current REAL DEFAULT 30.0",
  "ALTER TABLE events ADD COLUMN lat REAL",
  "ALTER TABLE events ADD COLUMN lng REAL"
];

for (const upgrade of schemaUpgrades) {
  try {
    db.prepare(upgrade).run();
  } catch (err) {
    // Ignore error if column already exists
  }
}

