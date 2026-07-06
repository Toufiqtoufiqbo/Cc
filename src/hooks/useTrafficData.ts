import { useState, useEffect, useRef } from 'react';
import { TrafficEvent, StatsSummary, HourlyStats, AlertEvent } from '../types';

const API_BASE = window.location.origin;
const WS_URL = API_BASE.replace(/^http/, "ws") + "/ws";

export function useTrafficData() {
  const [events, setEvents] = useState<TrafficEvent[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [summary, setSummary] = useState<StatsSummary[]>([]);
  const [hourly, setHourly] = useState<HourlyStats[]>([]);
  const [cameras, setCameras] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);

  // Fallback state for simulation when disconnected
  const idRef = useRef(0);

  useEffect(() => {
    // Fetch initial state
    fetch(`${API_BASE}/api/v1/stats/recent?limit=50`)
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(console.error);

    fetch(`${API_BASE}/api/v1/stats/summary`)
      .then(res => res.json())
      .then(data => setSummary(data))
      .catch(console.error);

    fetch(`${API_BASE}/api/v1/stats/hourly`)
      .then(res => res.json())
      .then(data => setHourly(data))
      .catch(console.error);

    fetch(`${API_BASE}/api/v1/alerts`)
      .then(res => res.json())
      .then(data => setAlerts(data))
      .catch(console.error);

    fetch(`${API_BASE}/api/v1/cameras`)
      .then(res => res.json())
      .then(data => setCameras(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;
    let retryDelay = 1000;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      try {
        ws = new WebSocket(WS_URL);
        ws.onopen = () => {
          setConnected(true);
          retryDelay = 1000;
        };
        ws.onmessage = (msg) => {
          try {
            const parsed = JSON.parse(msg.data);
            if (parsed.type === 'traffic_event') {
              const event: TrafficEvent = parsed.data;
              setEvents(prev => [event, ...prev].slice(0, 50));
              setLastEventTime(new Date(event.timestamp * 1000));
              
              // Optimistically update summary
              setSummary(prev => {
                const existing = prev.find(s => s.vehicle_type === event.vehicle_type && s.direction === event.direction);
                if (existing) {
                  return prev.map(s => s === existing ? { 
                    ...s, 
                    count: s.count + 1, 
                    violations: s.violations + (event.violation ? 1 : 0),
                    avg_speed: (s.avg_speed * s.count + event.speed_kmh) / (s.count + 1)
                  } : s);
                } else {
                  return [...prev, {
                    vehicle_type: event.vehicle_type,
                    direction: event.direction,
                    count: 1,
                    avg_speed: event.speed_kmh,
                    violations: event.violation ? 1 : 0
                  }];
                }
              });
            } else if (parsed.type === 'alert') {
              const alert = parsed.data as AlertEvent;
              setAlerts(prev => [alert, ...prev].slice(0, 100));
            } else if (parsed.type === 'camera_status') {
              const { id, status, fps } = parsed.data;
              setCameras(prev => prev.map(c => c.id === id ? { ...c, status, fps_current: fps } : c));
            } else if (parsed.type === 'camera_recording') {
              const { id, recording_status } = parsed.data;
              setCameras(prev => prev.map(c => c.id === id ? { ...c, recording_status } : c));
            } else {
              // Legacy format support for backwards compatibility
              const event: TrafficEvent = parsed;
              if (event.track_id) {
                setEvents(prev => [event, ...prev].slice(0, 50));
                setLastEventTime(new Date(event.timestamp * 1000));
              }
            }
          } catch (e) {
            console.error("Failed to parse WS message", e);
          }
        };
        ws.onerror = () => setConnected(false);
        ws.onclose = () => {
          setConnected(false);
          reconnectTimer = setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 30000);
        };
      } catch {
        setConnected(false);
        reconnectTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
      }
    };
    
    connect();

    // Simulation fallback
    const fallbackTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) return;
      
      const types: Array<"car" | "truck" | "bus" | "motorcycle"> = ["car", "car", "car", "truck", "bus", "motorcycle"];
      const vehicle_type = types[Math.floor(Math.random() * types.length)];
      const speed_kmh = Math.round(30 + Math.random() * 55);
      
      const event: TrafficEvent = {
        track_id: idRef.current++,
        vehicle_type,
        speed_kmh,
        direction: Math.random() > 0.5 ? "north" : "south",
        violation: speed_kmh > 60,
        timestamp: Date.now() / 1000,
        camera_id: `CAM-0${Math.floor(1 + Math.random() * 6)}`
      };

      setEvents(prev => [event, ...prev].slice(0, 50));
      setLastEventTime(new Date(event.timestamp * 1000));
      
      // Update summary optimistically in simulation
      setSummary(prev => {
        const existing = prev.find(s => s.vehicle_type === event.vehicle_type && s.direction === event.direction);
        if (existing) {
          return prev.map(s => s === existing ? { 
            ...s, 
            count: s.count + 1, 
            violations: s.violations + (event.violation ? 1 : 0),
            avg_speed: (s.avg_speed * s.count + event.speed_kmh) / (s.count + 1)
          } : s);
        } else {
          return [...prev, {
            vehicle_type: event.vehicle_type,
            direction: event.direction,
            count: 1,
            avg_speed: event.speed_kmh,
            violations: event.violation ? 1 : 0
          }];
        }
      });
      
    }, 2000);

    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      clearInterval(fallbackTimer);
      if (ws) ws.close();
    };
  }, []);

  return { events, summary, hourly, alerts, cameras, setCameras, connected, lastEventTime };
}
