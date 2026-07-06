import React, { useMemo } from 'react';
import { useTrafficData } from '../hooks/useTrafficData';
import { CameraFeed } from '../components/CameraFeed';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, CartesianGrid, Area, AreaChart, Cell 
} from "recharts";
import { Car, Bike, Bus, Truck, AlertTriangle, Gauge, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";

const VEHICLE_META = [
  { key: "car", label: "Car", icon: Car, color: "#4ADE80" },
  { key: "truck", label: "Truck", icon: Truck, color: "#37E6D1" },
  { key: "bus", label: "Bus", icon: Bus, color: "#FFB020" },
  { key: "motorcycle", label: "Moto", icon: Bike, color: "#FF5EA8" },
];

function MetricCard({ title, value, icon: Icon, trend, color, subtitle }: any) {
  return (
    <div className="bg-[#12171c] border border-[#232b32] rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Icon size={64} color={color} />
      </div>
      <div className="flex items-center justify-between relative z-10">
        <span className="text-xs font-mono uppercase tracking-widest text-[#7c8791]">{title}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div className="relative z-10">
        <div className="flex items-end gap-3">
          <div className="font-mono text-4xl text-[#e6e9ec] leading-none">{value}</div>
          {trend && (
            <div className={`flex items-center text-xs font-medium ${trend > 0 ? 'text-[#FF5E5E]' : 'text-[#4ADE80]'}`}>
              {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        {subtitle && <div className="text-xs text-[#7c8791] mt-2">{subtitle}</div>}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { events, summary, hourly, connected, lastEventTime } = useTrafficData();

  // Aggregated stats
  const totalVehicles = summary.reduce((sum, s) => sum + s.count, 0);
  const totalViolations = summary.reduce((sum, s) => sum + s.violations, 0);
  const avgSpeed = summary.length > 0 
    ? Math.round(summary.reduce((sum, s) => sum + (s.avg_speed * s.count), 0) / totalVehicles)
    : 0;

  // Chart data
  const typeChartData = VEHICLE_META.map(v => {
    const stat = summary.filter(s => s.vehicle_type === v.key);
    return {
      name: v.label,
      value: stat.reduce((sum, s) => sum + s.count, 0),
      color: v.color
    };
  });

  const timeChartData = useMemo(() => {
    // Fill empty hours for the chart
    const data = [];
    const currentHour = new Date().getHours();
    for (let i = 23; i >= 0; i--) {
      let h = currentHour - i;
      if (h < 0) h += 24;
      const stat = hourly.find(x => x.hour === h);
      data.push({
        time: `${h.toString().padStart(2, '0')}:00`,
        count: stat ? stat.count : 0,
        violations: stat ? stat.violations : 0
      });
    }
    return data;
  }, [hourly]);

  // Congestion calculation (mock logic based on recent event frequency)
  const recentCount = events.filter(e => (Date.now()/1000) - e.timestamp < 60).length;
  const congestionLevel = Math.min(100, Math.max(5, (recentCount / 30) * 100));

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Vehicles" 
          value={totalVehicles.toLocaleString()} 
          icon={Car} 
          color="#37E6D1" 
          trend={+12.5}
          subtitle="Since midnight"
        />
        <MetricCard 
          title="Avg Speed" 
          value={avgSpeed} 
          icon={Gauge} 
          color="#FFB020" 
          subtitle="km/h across all lanes"
        />
        <MetricCard 
          title="Violations" 
          value={totalViolations.toLocaleString()} 
          icon={AlertTriangle} 
          color="#FF5E5E" 
          trend={-2.4}
          subtitle="Speed > 60 km/h"
        />
        <MetricCard 
          title="System Status" 
          value={connected ? "LIVE" : "SIM"} 
          icon={Activity} 
          color={connected ? "#4ADE80" : "#7c8791"} 
          subtitle={lastEventTime ? `Last event: ${lastEventTime.toLocaleTimeString()}` : "Connecting..."}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Cameras & Flow */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CameraFeed cameraId="CAM-01" name="Junction 14 - Northbound" activeEvents={events} />
            <CameraFeed cameraId="CAM-02" name="Junction 14 - Southbound" activeEvents={events} />
          </div>

          <div className="bg-[#12171c] border border-[#232b32] rounded-xl p-5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-medium text-[#e6e9ec]">Traffic Flow (24h)</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeChartData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#37E6D1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#37E6D1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c232a" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fill: "#7c8791", fontSize: 11 }} 
                    axisLine={false} 
                    tickLine={false}
                    minTickGap={30}
                  />
                  <YAxis 
                    tick={{ fill: "#7c8791", fontSize: 11 }} 
                    axisLine={false} 
                    tickLine={false} 
                    width={40}
                  />
                  <RechartsTooltip
                    contentStyle={{ background: "#0a0d10", border: "1px solid #232b32", borderRadius: "8px", fontSize: 12 }}
                    itemStyle={{ color: "#e6e9ec" }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#37E6D1" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Breakdown & Events */}
        <div className="flex flex-col gap-6">
          
          {/* Congestion */}
          <div className="bg-[#12171c] border border-[#232b32] rounded-xl p-5">
            <h3 className="text-sm font-medium text-[#e6e9ec] mb-4">Congestion Index</h3>
            <div className="flex items-end justify-between mb-2">
              <span className="font-mono text-3xl text-white">{Math.round(congestionLevel)}%</span>
              <span className="text-xs text-[#7c8791] mb-1">
                {congestionLevel < 30 ? "Light Traffic" : congestionLevel < 70 ? "Moderate" : "Heavy"}
              </span>
            </div>
            <div className="h-2 w-full bg-[#1c232a] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#4ADE80] via-[#FFB020] to-[#FF5E5E] transition-all duration-1000" 
                style={{ width: `${congestionLevel}%` }} 
              />
            </div>
          </div>

          {/* Breakdown */}
          <div className="bg-[#12171c] border border-[#232b32] rounded-xl p-5">
            <h3 className="text-sm font-medium text-[#e6e9ec] mb-4">Vehicle Classes</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeChartData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fill: "#7c8791", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{fill: '#1a2128'}} contentStyle={{ background: "#0a0d10", border: "1px solid #232b32", borderRadius: "8px", fontSize: 12 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                    {typeChartData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Events List */}
          <div className="bg-[#12171c] border border-[#232b32] rounded-xl p-5 flex-1 flex flex-col min-h-[300px]">
            <h3 className="text-sm font-medium text-[#e6e9ec] mb-4">Live Event Feed</h3>
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3">
              {events.length === 0 && (
                <div className="text-sm text-[#7c8791] text-center mt-10">No recent events</div>
              )}
              {events.slice(0, 10).map((e) => {
                const Icon = VEHICLE_META.find(v => v.key === e.vehicle_type)?.icon || Car;
                const color = VEHICLE_META.find(v => v.key === e.vehicle_type)?.color || "#fff";
                
                return (
                  <div key={e.track_id} className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0d10] border border-[#1c232a]">
                    <div className="w-8 h-8 rounded bg-[#1c232a] flex items-center justify-center" style={{ color }}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-[#e6e9ec] capitalize">{e.vehicle_type}</span>
                        <span className="text-[10px] text-[#7c8791] font-mono">{new Date(e.timestamp * 1000).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] text-[#7c8791] font-mono">#{e.track_id} • {e.direction}</span>
                        <span className={`text-xs font-mono ${e.violation ? 'text-[#FF5E5E]' : 'text-[#4ADE80]'}`}>
                          {Math.round(e.speed_kmh)} km/h
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
