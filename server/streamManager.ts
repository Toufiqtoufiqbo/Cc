import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import { CameraRepository } from "./repositories/CameraRepository";
import { db } from "./db";

interface ActiveCamera {
  pythonProc: ChildProcess | null;
  ffmpegProc: ChildProcess | null;
  source: string;
  lastTelemetryTime: number;
  status: "online" | "offline";
  fps: number;
}

class StreamManager {
  private activeCameras = new Map<string, ActiveCamera>();
  private checkInterval: NodeJS.Timeout | null = null;
  private wsBroadcaster: ((event: any, type?: string) => void) | null = null;

  public setBroadcaster(broadcaster: (event: any, type?: string) => void) {
    this.wsBroadcaster = broadcaster;
  }

  private broadcast(event: any, type: string = "traffic_event") {
    if (this.wsBroadcaster) {
      this.wsBroadcaster(event, type);
    }
  }

  public init() {
    const streamsBase = path.join(
      process.cwd(),
      process.env.NODE_ENV === "production" ? "dist/streams" : "public/streams"
    );

    // Ensure clean directory structure for streaming segment isolation
    try {
      if (fs.existsSync(streamsBase)) {
        fs.rmSync(streamsBase, { recursive: true, force: true });
      }
      fs.mkdirSync(streamsBase, { recursive: true });
    } catch (e) {
      console.error("Failed to reset streams directory:", e);
    }

    // Initialize all cameras seeded in the database
    const cameras = CameraRepository.getAll();
    console.log(`[StreamManager] Initializing pipelines for ${cameras.length} cameras.`);

    for (const cam of cameras) {
      // Default fallback source (testsrc) or user RTSP/MP4 source if available
      const source = cam.rtsp_url || "testsrc";
      this.startCamera(cam.id, source);
    }

    // Start health monitoring and auto-recovery cycle (every 5 seconds)
    this.checkInterval = setInterval(() => this.healthCheck(), 5000);
  }

  public registerTelemetryActivity(cameraId: string, fpsValue?: number) {
    const cam = this.activeCameras.get(cameraId);
    const now = Date.now() / 1000;

    if (cam) {
      cam.lastTelemetryTime = now;
      if (fpsValue) cam.fps = fpsValue;

      if (cam.status === "offline") {
        console.log(`[StreamManager] Camera ${cameraId} recovered. Re-entering online state.`);
        cam.status = "online";
        CameraRepository.updateMetadata(cameraId, cam.fps, "online", "recording");
        
        // Resolve Camera Offline alert
        try {
          db.prepare(
            "UPDATE alerts SET resolved = 1 WHERE camera_id = ? AND type = 'CAMERA_OFFLINE'"
          ).run(cameraId);
        } catch (e) {}

        // Broadcast states
        this.broadcast({ id: cameraId, status: "online", fps: cam.fps }, "camera_status");
        this.broadcast({
          id: `OFFLINE-RESOLVED-${cameraId}`,
          type: "CAMERA_OFFLINE_RESOLVED",
          severity: "low",
          message: `Camera ${cameraId} has restored communication.`,
          camera_id: cameraId,
          timestamp: now
        }, "alert");
      }
    }
  }

  public startCamera(cameraId: string, source: string) {
    this.stopCamera(cameraId);

    const streamsBase = path.join(
      process.cwd(),
      process.env.NODE_ENV === "production" ? "dist/streams" : "public/streams"
    );
    const camDir = path.join(streamsBase, cameraId);
    fs.mkdirSync(camDir, { recursive: true });

    console.log(`[StreamManager] Starting HLS transmuxer and AI pipe for ${cameraId} using ${source}`);

    // 1. Spawning dynamic FFMPEG HLS stream generator
    let ffmpegProc: ChildProcess;
    const hlsPlaylist = path.join(camDir, "playlist.m3u8");

    if (source === "testsrc" || !source.startsWith("http") && !source.startsWith("rtsp") && !fs.existsSync(source)) {
      // High-Fidelity Roadway Grid and Overlay Generator
      const gridStyles: Record<string, string> = {
        "CAM-01": "testsrc=size=1280x720:rate=25,drawgrid=w=128:h=128:t=1:c=gray@0.2",
        "CAM-02": "testsrc=size=1280x720:rate=25,drawgrid=w=64:h=64:t=1:c=blue@0.1",
        "CAM-03": "testsrc=size=1280x720:rate=25,drawgrid=w=256:h=256:t=1:c=green@0.15",
        "CAM-04": "testsrc=size=1280x720:rate=25,drawgrid=w=100:h=100:t=1:c=red@0.1",
        "CAM-05": "testsrc=size=1280x720:rate=25,drawgrid=w=80:h=80:t=2:c=yellow@0.1",
        "CAM-06": "testsrc=size=1280x720:rate=25,drawgrid=w=150:h=150:t=1:c=purple@0.15",
      };
      const baseFilter = gridStyles[cameraId] || gridStyles["CAM-01"];
      const labelName = CameraRepository.getById(cameraId)?.name || "Live Junction Feed";

      const filterGraph = `${baseFilter},drawtext=text='ITMS ENTERPRISE | CAMERA: ${cameraId}':x=30:y=30:fontsize=32:fontcolor=0x37E6D1:box=1:boxcolor=black@0.6,drawtext=text='LOCATION: ${labelName}':x=30:y=75:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6,drawtext=text='LIVE RECORDING | UTC \\:%{pts\\\\:hms}':x=30:y=115:fontsize=18:fontcolor=0xFF5E5E:box=1:boxcolor=black@0.6`;

      ffmpegProc = spawn("ffmpeg", [
        "-f", "lavfi",
        "-i", filterGraph,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-tune", "zerolatency",
        "-g", "50",
        "-hls_time", "2",
        "-hls_list_size", "5",
        "-hls_flags", "delete_segments",
        "-f", "hls",
        hlsPlaylist
      ]);
    } else {
      // RTSP / IP Camera / Uploaded Video transmuxer
      ffmpegProc = spawn("ffmpeg", [
        "-re",
        "-i", source,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-tune", "zerolatency",
        "-g", "50",
        "-hls_time", "2",
        "-hls_list_size", "5",
        "-hls_flags", "delete_segments",
        "-f", "hls",
        hlsPlaylist
      ]);
    }

    ffmpegProc.stderr?.on("data", (data) => {
      // Suppress noisy output unless debug is required
    });

    ffmpegProc.on("exit", (code) => {
      console.log(`[StreamManager] FFMPEG stream process for ${cameraId} exited with code ${code}`);
    });

    // 2. Spawning the Python AI Vision Pipeline
    const pythonProc = spawn("python3", [
      "traffic_system_enterprise.py",
      "--source", source === "testsrc" ? "0" : source,
      "--camera", cameraId,
      "--api", "http://0.0.0.0:3000",
      "--speed_limit", "80.0"
    ]);

    pythonProc.stdout?.on("data", (data) => {
      console.log(`[Python AI - ${cameraId}] ${data.toString().trim()}`);
    });

    pythonProc.stderr?.on("data", (data) => {
      console.error(`[Python AI ERROR - ${cameraId}] ${data.toString().trim()}`);
    });

    pythonProc.on("exit", (code) => {
      console.log(`[StreamManager] Python AI process for ${cameraId} exited with code ${code}`);
    });

    // Register active states
    this.activeCameras.set(cameraId, {
      pythonProc,
      ffmpegProc,
      source,
      lastTelemetryTime: Date.now() / 1000,
      status: "online",
      fps: 30
    });

    // Save streaming status and link inside db
    CameraRepository.updateMetadata(cameraId, 30, "online", "recording");
    CameraRepository.updateUrls(cameraId, source.startsWith("rtsp") ? source : null, `/streams/${cameraId}/playlist.m3u8`);
  }

  public stopCamera(cameraId: string) {
    const cam = this.activeCameras.get(cameraId);
    if (cam) {
      console.log(`[StreamManager] Stopping camera processes for ${cameraId}`);
      if (cam.pythonProc) {
        try {
          cam.pythonProc.kill("SIGTERM");
        } catch (e) {}
      }
      if (cam.ffmpegProc) {
        try {
          cam.ffmpegProc.kill("SIGTERM");
        } catch (e) {}
      }
      this.activeCameras.delete(cameraId);
    }
  }

  private healthCheck() {
    const now = Date.now() / 1000;

    this.activeCameras.forEach((cam, cameraId) => {
      // 1. Telemetry Liveness Monitoring (Offline Detection)
      if (cam.status === "online" && now - cam.lastTelemetryTime > 15) {
        console.warn(`[StreamManager] Health check warning: No telemetry from ${cameraId} for 15s. Marking OFFLINE.`);
        cam.status = "offline";
        cam.fps = 0;
        CameraRepository.updateMetadata(cameraId, 0, "offline", "idle");

        // Generate persistent Camera Offline Alert in SQLite
        const alertMsg = `Critical Connection Loss: Traffic Camera ${cameraId} has disconnected. Check power and network link.`;
        try {
          const stmt = db.prepare(`
            INSERT INTO alerts (type, severity, message, timestamp, resolved, camera_id, ticket_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          const ticketId = `TKT-OFF-${cameraId}-${Math.round(now)}`;
          stmt.run("CAMERA_OFFLINE", "critical", alertMsg, now, 0, cameraId, ticketId);
          
          this.broadcast({
            id: ticketId,
            type: "CAMERA_OFFLINE",
            severity: "critical",
            message: alertMsg,
            camera_id: cameraId,
            timestamp: now
          }, "alert");
        } catch (e) {
          console.error("Failed to log offline alert:", e);
        }

        this.broadcast({ id: cameraId, status: "offline", fps: 0 }, "camera_status");
      }

      // 2. Process Auto-Recovery (Reconnect feature)
      if (cam.pythonProc && cam.pythonProc.killed) {
        console.log(`[StreamManager] Python AI process for ${cameraId} is dead. Restarting...`);
        this.startCamera(cameraId, cam.source);
      }
      if (cam.ffmpegProc && cam.ffmpegProc.killed) {
        console.log(`[StreamManager] FFMPEG stream for ${cameraId} is dead. Restarting...`);
        this.startCamera(cameraId, cam.source);
      }
    });
  }

  public shutdown() {
    if (this.checkInterval) clearInterval(this.checkInterval);
    const keys = Array.from(this.activeCameras.keys());
    for (const k of keys) this.stopCamera(k);
  }
}

export const streamManager = new StreamManager();
