import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useTrafficData } from '../hooks/useTrafficData';
import L from 'leaflet';
import { Activity } from 'lucide-react';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export function MapDashboard() {
  const { events, cameras, connected } = useTrafficData();

  // Compute live congestion based on active events in the last 15 seconds per camera
  const mapCamerasWithRealCongestion = useMemo(() => {
    const now = Date.now() / 1000;
    const activeEventsInWindow = events.filter(e => now - e.timestamp < 15);

    return cameras.map(cam => {
      const camEvents = activeEventsInWindow.filter(e => e.camera_id === cam.id);
      
      // Calculate dynamic congestion:
      // 0-1 vehicles = 15% (Light)
      // 2-4 vehicles = 45% (Moderate)
      // 5+ vehicles = 85% (Heavy)
      let congestion = 0.15;
      if (camEvents.length >= 5) {
        congestion = 0.85;
      } else if (camEvents.length >= 2) {
        congestion = 0.45;
      } else if (cam.status === 'offline') {
        congestion = 0.0;
      }

      return {
        ...cam,
        congestion,
        eventCount: camEvents.length
      };
    });
  }, [events, cameras]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 h-[calc(100vh-8rem)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white">Geospatial Intelligence</h2>
          <p className="text-sm text-[#7c8791] mt-1">Live camera locations and regional congestion mapping</p>
        </div>
        <div className="flex items-center gap-3 bg-[#12171c] border border-[#232b32] px-3 py-1.5 rounded-lg text-sm text-[#e6e9ec] font-mono">
           <Activity size={16} className={connected ? "text-[#37E6D1]" : "text-[#FFB020]"} />
           {connected ? "BROADCAST LINK: STABLE" : "BROADCAST LINK: SYNTHETIC"}
        </div>
      </div>

      <div className="bg-[#12171c] border border-[#232b32] rounded-xl flex-1 overflow-hidden relative">
        <MapContainer 
          center={[36.752887, 3.042048]} 
          zoom={13} 
          scrollWheelZoom={true} 
          style={{ height: "100%", width: "100%", background: '#0a0d10' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {mapCamerasWithRealCongestion.map(cam => {
            const lat = cam.lat || 36.752887;
            const lng = cam.lng || 3.042048;
            const isOnline = cam.status === 'online';

            return (
              <React.Fragment key={cam.id}>
                {isOnline && (
                  <Circle
                    center={[lat, lng]}
                    radius={cam.congestion * 600}
                    pathOptions={{ 
                      color: cam.congestion > 0.7 ? '#FF5E5E' : cam.congestion > 0.4 ? '#FFB020' : '#4ADE80', 
                      fillColor: cam.congestion > 0.7 ? '#FF5E5E' : cam.congestion > 0.4 ? '#FFB020' : '#4ADE80',
                      fillOpacity: 0.15,
                      weight: 1
                    }}
                  />
                )}
                <Marker position={[lat, lng]}>
                  <Popup className="enterprise-popup">
                    <div className="p-1 font-mono text-xs">
                      <div className="text-[10px] text-[#7c8791] mb-1 flex justify-between">
                        <span>{cam.id}</span>
                        <span className={isOnline ? "text-[#4ADE80]" : "text-[#FF5E5E]"}>
                          {isOnline ? "ONLINE" : "OFFLINE"}
                        </span>
                      </div>
                      <div className="font-semibold text-sm mb-2 text-white font-sans">{cam.name}</div>
                      {isOnline ? (
                        <div className="space-y-1">
                          <div>Congestion: <span className="font-bold text-white">{Math.round(cam.congestion * 100)}%</span></div>
                          <div>Active Targets: <span className="font-bold text-[#37E6D1]">{cam.eventCount}</span></div>
                          <div>Stream Type: <span className="capitalize">{cam.rtsp_url === 'testsrc' ? 'Synthetic' : 'RTSP Feed'}</span></div>
                        </div>
                      ) : (
                        <div className="text-[#FF5E5E] font-bold">LIVENESS TIMEOUT</div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>

        {/* Floating Map Legend */}
        <div className="absolute bottom-6 right-6 z-[400] bg-[#12171c]/90 backdrop-blur-md border border-[#232b32] rounded-lg p-4 shadow-xl">
          <h4 className="text-xs font-mono uppercase tracking-widest text-[#7c8791] mb-3">Congestion Level</h4>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FF5E5E]"></span>
              <span className="text-xs text-[#e6e9ec]">Heavy (&gt;70%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FFB020]"></span>
              <span className="text-xs text-[#e6e9ec]">Moderate (40-70%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#4ADE80]"></span>
              <span className="text-xs text-[#e6e9ec]">Light (&lt;40%)</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Global CSS override for Leaflet dark mode popup */}
      <style dangerouslySetInnerHTML={{__html: `
        .leaflet-popup-content-wrapper {
          background: #12171c !important;
          color: #e6e9ec !important;
          border: 1px solid #232b32 !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5) !important;
        }
        .leaflet-popup-tip {
          background: #12171c !important;
          border: 1px solid #232b32 !important;
        }
        .leaflet-container a.leaflet-popup-close-button {
          color: #7c8791 !important;
        }
      `}} />
    </div>
  );
}
