export type VehicleType = "car" | "truck" | "bus" | "motorcycle" | "emergency" | "pedestrian" | "bicycle";

export interface TrafficEvent {
  track_id: number;
  vehicle_type: VehicleType;
  speed_kmh: number;
  direction: "north" | "south" | "east" | "west";
  violation: boolean;
  timestamp: number;
  camera_id: string;
  confidence?: number;
  lane_id?: number;
  weather_condition?: string;
  plate_number?: string;
  color?: string;
  make?: string;
  model?: string;
}

export interface AlertEvent {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  camera_id: string;
  timestamp: number;
}

export interface StatsSummary {
  vehicle_type: VehicleType;
  direction: "north" | "south" | "east" | "west";
  count: number;
  avg_speed: number;
  violations: number;
}

export interface HourlyStats {
  hour: number;
  count: number;
  violations: number;
}

export interface Camera {
  id: string;
  name: string;
  location: string;
  status: "online" | "offline";
}
