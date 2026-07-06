import { db } from "../db";

export class CameraRepository {
  static getAll() {
    return db.prepare("SELECT * FROM cameras").all() as any[];
  }

  static getById(id: string) {
    return db.prepare("SELECT * FROM cameras WHERE id = ?").get(id) as any;
  }

  static updateStatus(id: string, status: string) {
    db.prepare("UPDATE cameras SET status = ? WHERE id = ?").run(status, id);
  }

  static updateMetadata(id: string, fps: number, status: string, recording: string) {
    db.prepare("UPDATE cameras SET fps_current = ?, status = ?, recording_status = ? WHERE id = ?").run(fps, status, recording, id);
  }

  static updateUrls(id: string, rtspUrl: string | null, streamUrl: string | null) {
    db.prepare("UPDATE cameras SET rtsp_url = ?, stream_url = ? WHERE id = ?").run(rtspUrl, streamUrl, id);
  }
}

