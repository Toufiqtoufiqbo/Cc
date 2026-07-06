import React, { useMemo, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { TrafficEvent } from '../types';

interface CameraFeedProps {
  cameraId: string;
  name: string;
  activeEvents: TrafficEvent[];
}

const VEHICLE_COLORS: Record<string, string> = {
  car: "#4ADE80",
  truck: "#37E6D1",
  bus: "#FFB020",
  motorcycle: "#FF5EA8",
};

export function CameraFeed({ cameraId, name, activeEvents }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let hls: Hls | null = null;
    const video = videoRef.current;
    if (video) {
      const streamUrl = `/streams/${cameraId}/playlist.m3u8`;
      
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
      } else if (Hls.isSupported()) {
        hls = new Hls({
          maxMaxBufferLength: 4,
          liveSyncDuration: 1.5,
          enableWorker: true,
          lowLatencyMode: true
        });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls?.recoverMediaError();
                break;
              default:
                break;
            }
          }
        });
      }
    }
    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [cameraId]);

  // Translate activeEvents into screen-space overlay boxes (within last 3 seconds)
  const now = Date.now() / 1000;
  const recentEvents = activeEvents.filter(e => now - e.timestamp < 3 && e.camera_id === cameraId);
  
  const boxes = useMemo(() => {
    return recentEvents.map((e) => {
      const hash = e.track_id * 2654435761 % 100;
      // Use coordinates if supplied by advanced telemetry, otherwise use deterministic placement
      const top = (e as any).bbox_top ? `${(e as any).bbox_top}%` : `${20 + (hash % 50)}%`;
      const left = (e as any).bbox_left ? `${(e as any).bbox_left}%` : `${10 + ((hash * 7) % 70)}%`;
      const w = (e as any).bbox_width ? (e as any).bbox_width : (e.vehicle_type === 'truck' ? 70 : e.vehicle_type === 'bus' ? 80 : e.vehicle_type === 'motorcycle' ? 30 : 50);
      const h = (e as any).bbox_height ? (e as any).bbox_height : (e.vehicle_type === 'truck' ? 45 : e.vehicle_type === 'bus' ? 50 : e.vehicle_type === 'motorcycle' ? 20 : 35);
      
      return {
        id: e.track_id,
        type: e.vehicle_type,
        speed: e.speed_kmh,
        top,
        left,
        w,
        h,
      };
    });
  }, [recentEvents]);

  return (
    <div className="relative w-full h-full min-h-[240px] overflow-hidden rounded-md border border-[#232b32] bg-gradient-to-b from-[#1a2128] to-[#0d1216]">
      {/* Live Video Player Element */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        autoPlay
        muted
        playsInline
        loop
      />

      {/* Road layout lines (visual overlay grid for backup) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute left-[33%] top-0 bottom-0 w-px bg-[repeating-linear-gradient(to_bottom,#8a95a0_0,#8a95a0_16px,transparent_16px,transparent_32px)]" />
        <div className="absolute left-[66%] top-0 bottom-0 w-px bg-[repeating-linear-gradient(to_bottom,#8a95a0_0,#8a95a0_16px,transparent_16px,transparent_32px)]" />
      </div>
      
      {/* Scan effect */}
      <div className="absolute inset-x-0 h-32 bg-gradient-to-b from-transparent via-[#37E6D1]/3 to-transparent animate-[scan_6s_linear_infinite] pointer-events-none" />
      
      {/* Detection boxes */}
      {boxes.map((b) => (
        <div
          key={b.id}
          className="absolute border-[1.5px] rounded-[2px] transition-all duration-300 ease-linear"
          style={{ 
            top: b.top, 
            left: b.left, 
            width: `${b.w}px`, 
            height: `${b.h}px`, 
            borderColor: VEHICLE_COLORS[b.type] || "#fff",
            backgroundColor: `${VEHICLE_COLORS[b.type]}10`
          }}
        >
          <div
            className="absolute -top-5 left-[-1px] text-[9px] font-mono px-1 py-0.5 rounded-sm whitespace-nowrap flex items-center gap-1"
            style={{ background: VEHICLE_COLORS[b.type], color: "#0a0d10" }}
          >
            <span className="font-bold uppercase">{b.type}</span>
            <span className="opacity-80">#{b.id}</span>
            <span className="opacity-90">{Math.round(b.speed)}km/h</span>
          </div>
        </div>
      ))}
      
      {/* Overlay data */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1 bg-black/50 p-2 rounded backdrop-blur-sm">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#7c8791]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#37E6D1] animate-pulse" />
          {cameraId} · LIVE HLS
        </div>
        <div className="text-xs font-medium text-white/80">{name}</div>
      </div>
      
      <style>{`
        @keyframes scan { 0% { top: -8rem; } 100% { top: 100%; } }
      `}</style>
    </div>
  );
}
