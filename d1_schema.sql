-- Cloudflare D1 SQL Schema for IIM Bodh Gaya CampusRide
-- Run with: npx wrangler d1 execute campusride-db --file=./d1_schema.sql

-- 1. Users Table (Stores Student Trust Scores & SSO Identity)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  trust_score REAL NOT NULL DEFAULT 100.0,
  active_trip_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Designated Campus Pickup & Drop Hubs Table
CREATE TABLE IF NOT EXISTS hubs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  radius_meters REAL NOT NULL DEFAULT 60.0,
  capacity INTEGER NOT NULL DEFAULT 25,
  description TEXT,
  icon TEXT DEFAULT 'MapPin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Trips & Telemetry Table
CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  user_name TEXT,
  user_email TEXT,
  cycle_id INTEGER,
  cycle_code TEXT,
  start_hub_id INTEGER,
  start_hub_name TEXT,
  end_hub_id INTEGER,
  end_hub_name TEXT,
  start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME,
  duration_minutes REAL,
  photo_verified INTEGER DEFAULT 1,
  trust_score_delta REAL DEFAULT 0.0,
  within_geofence INTEGER DEFAULT 1,
  status TEXT DEFAULT 'completed'
);

-- Seed Initial Users
INSERT OR IGNORE INTO users (id, name, email, role, trust_score) VALUES
  (1, 'Aarav Sharma', 'aarav.s2025@iimbg.ac.in', 'student', 98.5),
  (2, 'Priya Patel', 'priya.p2025@iimbg.ac.in', 'student', 92.0),
  (3, 'Rohan Verma', 'rohan.v2025@iimbg.ac.in', 'student', 100.0),
  (4, 'Sneha Mukherjee', 'sneha.m2025@iimbg.ac.in', 'student', 88.0),
  (5, 'Campus Fleet Admin', 'admin@iimbg.ac.in', 'admin', 100.0);

-- Seed Designated Campus Hubs (Centered ~24.6961° N, 84.9869° E)
INSERT OR IGNORE INTO hubs (id, name, code, lat, lng, radius_meters, capacity, description, icon) VALUES
  (1, 'Main Gate', 'HUB-MG', 24.6985, 84.9855, 60.0, 30, 'Primary campus entrance & visitor check.', 'DoorOpen'),
  (2, 'Academic Block', 'HUB-AB', 24.6965, 84.9875, 65.0, 40, 'Main lecture halls & library.', 'BookOpen'),
  (3, 'Mess / Annapurna', 'HUB-MS', 24.6955, 84.9865, 60.0, 30, 'Central dining hall & cafeteria.', 'Utensils'),
  (4, 'Sports Complex / Udaan', 'HUB-SC', 24.6945, 84.9880, 70.0, 25, 'Gymnasium & badminton courts.', 'Activity'),
  (5, 'H1 & H2 Hostel', 'HUB-H1H2', 24.6970, 84.9890, 60.0, 25, 'Residence blocks H1 and H2.', 'Home'),
  (6, 'H3 & H4 Hostel', 'HUB-H3H4', 24.6960, 84.9895, 60.0, 25, 'Residence blocks H3 and H4.', 'Home'),
  (7, 'Hostel Block', 'HUB-HSTL', 24.6950, 84.9900, 60.0, 20, 'Executive residence.', 'Building'),
  (8, 'Siang + Bose Hostel', 'HUB-SB', 24.6940, 84.9890, 60.0, 20, 'Siang and Bose student accommodation.', 'Home'),
  (9, 'Gargi Hostel', 'HUB-GH', 24.6935, 84.9875, 60.0, 20, 'Gargi women hostel precinct.', 'Home'),
  (10, 'Aryabhatta Hostel', 'HUB-AH', 24.6975, 84.9880, 60.0, 20, 'Post-graduate student residence.', 'Home');
