import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { createServer as createViteServer } from "vite";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { EventRepository } from "./server/repositories/EventRepository";
import { CameraRepository } from "./server/repositories/CameraRepository";
import { TrafficService } from "./server/services/TrafficService";
import { db } from "./server/db";
import { streamManager } from "./server/streamManager";


const PORT = 3000;
const app = express();

// Enterprise Security & Performance Middlewares
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// OpenAPI Configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ITMS Enterprise API',
      version: '3.0.0',
      description: 'Intelligent Transportation Management System API for AI vision telemetry, smart city sensors, and digital twin operations.',
    },
    servers: [{ url: '/api/v1' }],
  },
  apis: ['./server.ts', './server/**/*.ts'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.get('/api-docs/swagger.json', (req, res) => res.json(swaggerSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

// WebSocket Manager
const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
  clients.add(ws);
  ws.on("close", () => {
    clients.delete(ws);
  });
});

function broadcast(event: any, type: string = 'traffic_event') {
  const message = JSON.stringify({ type, data: event });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// REST Endpoints - Versioned API
const apiRouter = express.Router();

apiRouter.post("/events", (req, res) => {
  try {
    const payload = req.body;
    const cameraId = payload.camera_id || 'CAM-01';
    
    // Register telemetry liveness activity on the camera stream
    streamManager.registerTelemetryActivity(cameraId);

    if (payload.type === 'INCIDENT') {
      const result = TrafficService.processIncident(payload);
      
      broadcast({
        id: result.ticketId,
        type: payload.incident_type,
        severity: result.severity,
        message: result.message,
        camera_id: payload.camera_id,
        timestamp: payload.timestamp
      }, 'alert');

      return res.json({ status: "ok", ticketId: result.ticketId });
    }
    
    // Delegate to Service Layer (DDD)
    const result = TrafficService.processTelemetryEvent(payload);
    
    // Broadcast real-time event using the normalized payload
    broadcast(result.normalizedPayload, 'traffic_event');
    
    // Simulate smart alert for anomalies
    if (result.isAnomaly) {
      broadcast({
        severity: result.normalizedPayload.speed_kmh > 120 ? 'critical' : 'high',
        message: `Speed anomaly detected: ${Math.round(result.normalizedPayload.speed_kmh)} km/h (${result.normalizedPayload.vehicle_type})`,
        camera_id: result.normalizedPayload.camera_id,
        timestamp: result.normalizedPayload.timestamp
      }, 'alert');
    }
    
    res.json({ status: "ok" });
  } catch (error: any) {
    console.error("Error processing event:", error.message);
    res.status(400).json({ error: error.message || "Internal server error" });
  }
});

apiRouter.post("/cameras/:id/toggle-recording", (req, res) => {
  try {
    const { id } = req.params;
    const cam = CameraRepository.getById(id);
    if (!cam) return res.status(404).json({ error: "Camera not found" });
    const nextStatus = cam.recording_status === 'recording' ? 'idle' : 'recording';
    db.prepare("UPDATE cameras SET recording_status = ? WHERE id = ?").run(nextStatus, id);
    broadcast({ id, recording_status: nextStatus }, "camera_recording");
    res.json({ status: "ok", recording_status: nextStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post("/cameras/:id/change-source", (req, res) => {
  try {
    const { id } = req.params;
    const { source } = req.body;
    if (!source) return res.status(400).json({ error: "Source URL is required" });
    const cam = CameraRepository.getById(id);
    if (!cam) return res.status(404).json({ error: "Camera not found" });
    
    db.prepare("UPDATE cameras SET rtsp_url = ? WHERE id = ?").run(source, id);
    streamManager.startCamera(id, source);
    res.json({ status: "ok", source });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get("/stats/summary", (req, res) => {
  try {
    const rows = EventRepository.getSummary();
    const summary = rows.map(r => ({
      vehicle_type: r.vehicle_type,
      direction: r.direction,
      count: r.count,
      avg_speed: Math.round((r.avg_speed || 0) * 10) / 10,
      violations: r.violations || 0
    }));
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

apiRouter.get("/stats/recent", (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const rows = EventRepository.getRecent(limit);
    const recent = rows.map(r => ({
      ...r,
      violation: Boolean(r.violation)
    }));
    res.json(recent);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

apiRouter.get("/stats/hourly", (req, res) => {
  try {
    const rows = EventRepository.getHourly();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

apiRouter.get("/cameras", (req, res) => {
  try {
    res.json(CameraRepository.getAll());
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

apiRouter.get("/alerts", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 50").all();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

apiRouter.post("/alerts/:id/resolve", (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("UPDATE alerts SET resolved = 1 WHERE ticket_id = ?").run(id);
    res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

apiRouter.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    version: "2.0.0",
    uptime: process.uptime(),
    connected_clients: clients.size, 
    time: Date.now() / 1000 
  });
});

app.use("/api/v1", apiRouter);

// Fallback for old routes
app.use("/", apiRouter);

// Setup Vite for development or serve static files for production
async function startServer() {
  const streamsPath = path.join(process.cwd(), process.env.NODE_ENV === "production" ? "dist/streams" : "public/streams");
  app.use('/streams', express.static(streamsPath));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind WebSocket broadcaster and launch the dynamic stream + AI manager
  streamManager.setBroadcaster(broadcast);
  streamManager.init();

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Enterprise Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
