import { EventRepository } from '../repositories/EventRepository';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export class TrafficService {
  /**
   * Process a new telemetry event from the AI vision pipeline.
   */
  static processTelemetryEvent(payload: any) {
    if (!payload.track_id || !payload.vehicle_type || !payload.speed_kmh) {
      throw new Error("Invalid payload: missing core telemetry fields");
    }

    payload.speed_kmh = Math.abs(parseFloat(payload.speed_kmh));
    const isAnomaly = payload.speed_kmh > 120 || payload.speed_kmh < 5;
    
    const id = EventRepository.insert(payload);
    
    return {
      success: true,
      id,
      isAnomaly,
      normalizedPayload: payload
    };
  }

  /**
   * Process a high-priority incident event from the AI vision pipeline.
   */
  static processIncident(payload: any) {
    if (!payload.incident_type || !payload.camera_id) {
      throw new Error("Invalid incident payload");
    }

    const ticketId = `TKT-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Create an alert/ticket in the database
    const stmt = db.prepare(`
      INSERT INTO alerts (type, severity, message, timestamp, camera_id, assigned_to, ticket_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const message = `[${payload.incident_type}] Detected near ${payload.camera_id}. ${payload.plate_number ? 'Plate: ' + payload.plate_number : ''}`;

    stmt.run(
      payload.incident_type,
      payload.severity || 'high',
      message,
      payload.timestamp || (Date.now() / 1000),
      payload.camera_id,
      'UNASSIGNED',
      ticketId
    );

    return {
      success: true,
      ticketId,
      message,
      severity: payload.severity || 'high',
      normalizedPayload: payload
    };
  }
}
