import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Bell, Search, Filter, CheckCircle2, XCircle } from 'lucide-react';
import { useTrafficData } from '../hooks/useTrafficData';

export function AlertCenter() {
  const { alerts: backendAlerts } = useTrafficData();
  const [filter, setFilter] = useState('');

  // Normalize alerts from backend
  const alerts = backendAlerts.map(a => ({
    id: a.id,
    type: a.type,
    severity: a.severity,
    message: a.message,
    camera: a.camera_id,
    time: new Date(a.timestamp * 1000),
    resolved: (a as any).resolved === 1
  }));

  const filteredAlerts = alerts.filter(a => 
    a.message.toLowerCase().includes(filter.toLowerCase()) || 
    a.type.toLowerCase().includes(filter.toLowerCase())
  );

  const resolveAlert = async (id: string) => {
    try {
      await fetch(`/api/v1/alerts/${id}/resolve`, { method: 'POST' });
      // It'll refresh on next polling or we can just trigger a reload. 
      // For now, simple reload:
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-6xl mx-auto h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white">Alert Center</h2>
          <p className="text-sm text-[#7c8791] mt-1">Real-time anomaly and incident management</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7c8791]" size={16} />
            <input 
              type="text" 
              placeholder="Search incidents..." 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="bg-[#12171c] border border-[#232b32] rounded-lg pl-9 pr-4 py-2 text-sm text-[#e6e9ec] focus:outline-none focus:border-[#37E6D1]/50 w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#12171c] border border-[#232b32] rounded-lg text-sm text-[#e6e9ec] hover:bg-[#1a2128] transition-colors">
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
        <div className="bg-[#1a1515] border border-[#FF5E5E]/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#FF5E5E] font-medium text-sm">Critical</span>
            <ShieldAlert size={18} className="text-[#FF5E5E]" />
          </div>
          <div className="text-3xl font-mono text-white">{alerts.filter(a => a.severity === 'critical' && !a.resolved).length}</div>
        </div>
        <div className="bg-[#1a1712] border border-[#FFB020]/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#FFB020] font-medium text-sm">High</span>
            <AlertTriangle size={18} className="text-[#FFB020]" />
          </div>
          <div className="text-3xl font-mono text-white">{alerts.filter(a => a.severity === 'high' && !a.resolved).length}</div>
        </div>
        <div className="bg-[#12161a] border border-[#37E6D1]/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#37E6D1] font-medium text-sm">Medium</span>
            <Bell size={18} className="text-[#37E6D1]" />
          </div>
          <div className="text-3xl font-mono text-white">{alerts.filter(a => (a.severity === 'medium' || a.severity === 'low') && !a.resolved).length}</div>
        </div>
        <div className="bg-[#12171c] border border-[#232b32] rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#7c8791] font-medium text-sm">Resolved Today</span>
            <CheckCircle2 size={18} className="text-[#7c8791]" />
          </div>
          <div className="text-3xl font-mono text-white">{alerts.filter(a => a.resolved).length}</div>
        </div>
      </div>

      <div className="bg-[#12171c] border border-[#232b32] rounded-xl flex-1 flex flex-col min-h-[400px] overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="sticky top-0 bg-[#12171c] text-xs uppercase font-medium text-[#7c8791] border-b border-[#1c232a] z-10">
              <tr>
                <th className="px-6 py-4">Severity</th>
                <th className="px-6 py-4">Message</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c232a]">
              {filteredAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-[#1a2128]/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-medium uppercase tracking-wider
                      ${alert.severity === 'critical' ? 'bg-[#FF5E5E]/10 text-[#FF5E5E] border border-[#FF5E5E]/20' : 
                        alert.severity === 'high' ? 'bg-[#FFB020]/10 text-[#FFB020] border border-[#FFB020]/20' : 
                        'bg-[#37E6D1]/10 text-[#37E6D1] border border-[#37E6D1]/20'}
                    `}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#e6e9ec]">
                    {alert.message}
                  </td>
                  <td className="px-6 py-4 text-[#7c8791] font-mono">
                    {alert.camera}
                  </td>
                  <td className="px-6 py-4 text-[#7c8791]">
                    {alert.time.toLocaleTimeString('en-GB')}
                  </td>
                  <td className="px-6 py-4">
                    {alert.resolved ? (
                      <span className="flex items-center gap-1.5 text-xs text-[#7c8791]">
                        <CheckCircle2 size={14} /> Resolved
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-[#FFB020]">
                        <XCircle size={14} /> Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!alert.resolved && (
                      <button 
                        onClick={() => resolveAlert(alert.id as string)}
                        className="px-3 py-1.5 bg-[#1a2128] border border-[#232b32] hover:bg-[#232b32] text-white rounded text-xs transition-colors">
                        Acknowledge
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredAlerts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[#7c8791]">No alerts found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
