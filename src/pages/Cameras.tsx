import React, { useState } from 'react';
import { CameraFeed } from '../components/CameraFeed';
import { useTrafficData } from '../hooks/useTrafficData';
import { Settings2, Plus, Grid, List, Video, VideoOff, RefreshCw, Edit, Save, X } from 'lucide-react';

export function Cameras() {
  const { events, cameras, setCameras } = useTrafficData();
  const [editingCameraId, setEditingCameraId] = useState<string | null>(null);
  const [newSource, setNewSource] = useState<string>('');
  const [loading, setLoading] = useState<string | null>(null);

  const toggleRecording = async (cameraId: string) => {
    setLoading(cameraId);
    try {
      const res = await fetch(`/api/v1/cameras/${cameraId}/toggle-recording`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.status === "ok") {
        setCameras(prev => prev.map(c => c.id === cameraId ? { ...c, recording_status: data.recording_status } : c));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const changeSource = async (cameraId: string) => {
    if (!newSource.trim()) return;
    setLoading(cameraId);
    try {
      const res = await fetch(`/api/v1/cameras/${cameraId}/change-source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: newSource })
      });
      const data = await res.json();
      if (data.status === "ok") {
        setCameras(prev => prev.map(c => c.id === cameraId ? { ...c, rtsp_url: newSource } : c));
        setEditingCameraId(null);
        setNewSource('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Camera Network</h2>
          <p className="text-sm text-[#7c8791] mt-1">Live enterprise camera monitoring and AI processing streams</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#12171c] border border-[#232b32] rounded-lg p-1">
            <button className="p-1.5 bg-[#1a2128] text-white rounded shadow-sm"><Grid size={16} /></button>
            <button className="p-1.5 text-[#7c8791] hover:text-white rounded"><List size={16} /></button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#12171c] hover:bg-[#1a2128] border border-[#232b32] rounded-lg text-sm text-[#e6e9ec] transition-colors">
            <Settings2 size={16} /> Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {cameras.map((cam) => {
          const isOnline = cam.status === 'online';
          const isRecording = cam.recording_status === 'recording';

          return (
            <div key={cam.id} className="bg-[#12171c] border border-[#232b32] rounded-xl overflow-hidden flex flex-col group hover:border-[#37E6D1]/30 transition-all duration-300 shadow-lg">
              {/* Header Info */}
              <div className="p-4 border-b border-[#1c232a] flex items-start justify-between bg-[#0a0d10]/50">
                <div>
                  <h3 className="font-medium text-[#e6e9ec]">{cam.name}</h3>
                  <p className="text-xs text-[#7c8791] mt-0.5">{cam.location}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isRecording && (
                    <span className="w-2 h-2 rounded-full bg-[#FF5E5E] animate-pulse" title="Recording Active" />
                  )}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    isOnline 
                      ? 'bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/20' 
                      : 'bg-[#FF5E5E]/10 text-[#FF5E5E] border-[#FF5E5E]/20 animate-pulse'
                  }`}>
                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </div>

              {/* Feed Element */}
              <div className="p-4 flex-1">
                <CameraFeed cameraId={cam.id} name={cam.name} activeEvents={events} />
              </div>

              {/* Edit Source URL Overlay / Control */}
              {editingCameraId === cam.id ? (
                <div className="p-4 border-t border-[#1c232a] bg-[#1a2128]/40 space-y-2">
                  <label className="text-[10px] font-mono text-[#7c8791] uppercase">Camera Stream Source (RTSP/USB/IP/MP4):</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-[#0d1216] border border-[#232b32] rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#37E6D1]"
                      placeholder="e.g. rtsp://192.168.1.100:554/h264"
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                    />
                    <button
                      onClick={() => changeSource(cam.id)}
                      disabled={loading === cam.id}
                      className="p-2 bg-[#37E6D1] text-[#0a0d10] hover:bg-[#2bc4b1] rounded transition-colors"
                      title="Save Stream"
                    >
                      <Save size={14} />
                    </button>
                    <button
                      onClick={() => setEditingCameraId(null)}
                      className="p-2 bg-[#232b32] text-white hover:bg-[#2e3740] rounded transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Footer Meta & Interaction */}
              <div className="px-4 py-3 border-t border-[#1c232a] bg-[#0a0d10]/50 flex justify-between items-center text-xs text-[#7c8791] font-mono">
                <div className="flex items-center gap-4">
                  <span>FPS: {cam.fps_current || 0}</span>
                  <span className="capitalize">Type: {cam.rtsp_url && cam.rtsp_url !== 'testsrc' ? 'RTSP/IP' : 'AI Synthetic'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingCameraId(cam.id);
                      setNewSource(cam.rtsp_url || 'testsrc');
                    }}
                    className="p-1 hover:text-white transition-colors"
                    title="Change Stream Source"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => toggleRecording(cam.id)}
                    disabled={loading === cam.id}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${
                      isRecording 
                        ? 'border-[#FF5E5E]/20 bg-[#FF5E5E]/5 text-[#FF5E5E] hover:bg-[#FF5E5E]/10' 
                        : 'border-[#232b32] hover:bg-[#1a2128] text-[#7c8791] hover:text-[#e6e9ec]'
                    }`}
                  >
                    {isRecording ? <Video size={12} /> : <VideoOff size={12} />}
                    <span>{isRecording ? 'REC' : 'IDLE'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
