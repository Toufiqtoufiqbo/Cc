import React from 'react';
import { useTrafficData } from '../hooks/useTrafficData';
import { AlertTriangle, MapPin, ExternalLink, ShieldCheck } from 'lucide-react';

export function Violations() {
  const { events } = useTrafficData();
  
  // Filter only violations
  const violations = events.filter(e => e.violation);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white">Infraction Log</h2>
          <p className="text-sm text-[#7c8791] mt-1">Live monitoring of speeding and traffic violations</p>
        </div>
      </div>

      <div className="bg-[#12171c] border border-[#232b32] rounded-xl flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#1c232a] bg-[#1a2128]/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#37E6D1]" />
            <span className="text-sm font-medium text-[#e6e9ec]">Automated Enforcement Active</span>
          </div>
          <span className="text-xs text-[#7c8791] font-mono">{violations.length} incidents recorded</span>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="sticky top-0 bg-[#12171c] text-xs uppercase font-medium text-[#7c8791] border-b border-[#1c232a]">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Incident ID</th>
                <th className="px-6 py-4">Camera / Zone</th>
                <th className="px-6 py-4">Vehicle Type</th>
                <th className="px-6 py-4">Recorded Speed</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c232a]">
              {violations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[#7c8791]">
                    No violations recorded in the current session.
                  </td>
                </tr>
              ) : violations.map((v) => (
                <tr key={v.track_id} className="hover:bg-[#1a2128]/50 transition-colors">
                  <td className="px-6 py-4 text-[#e6e9ec] font-mono">
                    {new Date(v.timestamp * 1000).toLocaleString('en-GB')}
                  </td>
                  <td className="px-6 py-4 text-[#7c8791] font-mono">
                    #{v.track_id.toString().padStart(6, '0')}
                  </td>
                  <td className="px-6 py-4 text-[#e6e9ec]">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-[#7c8791]" />
                      {v.camera_id}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#e6e9ec] capitalize">
                    {v.vehicle_type}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-[#FF5E5E]/10 text-[#FF5E5E] border border-[#FF5E5E]/20">
                      <AlertTriangle size={12} />
                      {Math.round(v.speed_kmh)} km/h
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-[#37E6D1] hover:text-[#2bc4b1] transition-colors p-1">
                      <ExternalLink size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
