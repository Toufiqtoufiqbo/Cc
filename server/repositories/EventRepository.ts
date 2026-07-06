import { db } from "../db";

export class EventRepository {
  static insert(event: any) {
    const stmt = db.prepare(`
      INSERT INTO events (track_id, vehicle_type, speed_kmh, direction, violation, timestamp, camera_id, confidence, lane_id, weather_condition, plate_number, color, make, model, lat, lng)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      event.track_id, 
      event.vehicle_type, 
      event.speed_kmh, 
      event.direction, 
      event.violation ? 1 : 0, 
      event.timestamp, 
      event.camera_id || 'CAM-01',
      event.confidence || 0.9,
      event.lane_id || 1,
      event.weather_condition || 'clear',
      event.plate_number || null,
      event.color || null,
      event.make || null,
      event.model || null,
      event.lat || null,
      event.lng || null
    );
    return info.lastInsertRowid;
  }

  static getSummary() {
    const stmt = db.prepare(`
      SELECT 
        vehicle_type, 
        direction, 
        COUNT(*) as count, 
        AVG(speed_kmh) as avg_speed, 
        SUM(violation) as violations
      FROM events 
      GROUP BY vehicle_type, direction
    `);
    return stmt.all() as any[];
  }

  static getRecent(limit: number = 50) {
    const stmt = db.prepare(`
      SELECT *
      FROM events 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    return stmt.all(limit) as any[];
  }

  static getHourly(hours: number = 24) {
    const now = Date.now() / 1000;
    const since = now - hours * 3600;
    
    const stmt = db.prepare(`
      SELECT 
        CAST(strftime('%H', datetime(timestamp, 'unixepoch', 'localtime')) AS INTEGER) as hour,
        COUNT(*) as count,
        SUM(violation) as violations
      FROM events
      WHERE timestamp >= ?
      GROUP BY hour
      ORDER BY hour ASC
    `);
    return stmt.all(since);
  }
}
