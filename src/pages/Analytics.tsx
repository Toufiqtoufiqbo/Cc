import React, { useMemo } from 'react';
import { useTrafficData } from '../hooks/useTrafficData';
import { 
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, CartesianGrid, Legend, LineChart, Line, AreaChart, Area
} from "recharts";
import { Download, Calendar, Filter, BarChart3, Brain, FileText, TrendingUp, AlertOctagon } from 'lucide-react';

export function Analytics() {
  const { summary } = useTrafficData();

  // Aggregate by vehicle type for detailed charting
  const aggregatedData = summary.reduce((acc, curr) => {
    const existing = acc.find(item => item.type === curr.vehicle_type);
    if (existing) {
      existing[curr.direction] = curr.count;
    } else {
      acc.push({
        type: curr.vehicle_type,
        north: curr.direction === 'north' ? curr.count : 0,
        south: curr.direction === 'south' ? curr.count : 0,
        east: curr.direction === 'east' ? curr.count : 0,
        west: curr.direction === 'west' ? curr.count : 0,
      });
    }
    return acc;
  }, [] as any[]);

  const predictionData = useMemo(() => [
    { time: '08:00', actual: 4200, predicted: 4100 },
    { time: '09:00', actual: 5100, predicted: 5050 },
    { time: '10:00', actual: 3800, predicted: 3900 },
    { time: '11:00', actual: 3200, predicted: 3100 },
    { time: '12:00', actual: null, predicted: 3400 },
    { time: '13:00', actual: null, predicted: 3600 },
    { time: '14:00', actual: null, predicted: 3800 },
    { time: '15:00', actual: null, predicted: 4500 },
    { time: '16:00', actual: null, predicted: 5800 },
    { time: '17:00', actual: null, predicted: 6200 },
  ], []);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Advanced Analytics & Predictions</h2>
          <p className="text-sm text-[#7c8791] mt-1">Machine learning insights, KPIs, and executive reporting</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#12171c] hover:bg-[#1a2128] border border-[#232b32] rounded-lg text-sm text-[#e6e9ec] transition-colors">
            <Calendar size={16} /> Last 7 Days
          </button>
          <div className="group relative">
            <button className="flex items-center gap-2 px-4 py-2 bg-[#37E6D1]/10 text-[#37E6D1] hover:bg-[#37E6D1]/20 border border-[#37E6D1]/20 rounded-lg text-sm transition-colors">
              <Download size={16} /> Export Report
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-[#12171c] border border-[#232b32] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50">
              <div className="p-1">
                <button className="w-full text-left px-4 py-2 text-sm text-[#e6e9ec] hover:bg-[#1a2128] rounded flex items-center gap-2"><FileText size={14}/> PDF Executive Summary</button>
                <button className="w-full text-left px-4 py-2 text-sm text-[#e6e9ec] hover:bg-[#1a2128] rounded flex items-center gap-2"><FileText size={14}/> CSV Raw Telemetry</button>
                <button className="w-full text-left px-4 py-2 text-sm text-[#e6e9ec] hover:bg-[#1a2128] rounded flex items-center gap-2"><FileText size={14}/> Excel Government KPI</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Predictions Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#12171c] border border-[#232b32] rounded-xl p-5 border-l-2 border-l-[#A855F7]">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="text-[#A855F7]" size={18} />
            <span className="text-sm font-medium text-[#e6e9ec]">Peak Hour Prediction</span>
          </div>
          <div className="text-2xl font-mono text-white mb-1">17:00 - 18:30</div>
          <div className="text-xs text-[#7c8791]">94% confidence • +15% vs average</div>
        </div>
        <div className="bg-[#12171c] border border-[#232b32] rounded-xl p-5 border-l-2 border-l-[#FFB020]">
          <div className="flex items-center gap-3 mb-2">
            <AlertOctagon className="text-[#FFB020]" size={18} />
            <span className="text-sm font-medium text-[#e6e9ec]">Accident Probability</span>
          </div>
          <div className="text-2xl font-mono text-white mb-1">Low (1.2%)</div>
          <div className="text-xs text-[#7c8791]">Sector 7 Intersection • Rain forecast</div>
        </div>
        <div className="bg-[#12171c] border border-[#232b32] rounded-xl p-5 border-l-2 border-l-[#37E6D1]">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-[#37E6D1]" size={18} />
            <span className="text-sm font-medium text-[#e6e9ec]">Est. Travel Time (North)</span>
          </div>
          <div className="text-2xl font-mono text-white mb-1">24 mins</div>
          <div className="text-xs text-[#4ADE80]">-3 mins faster than usual</div>
        </div>
        <div className="bg-[#12171c] border border-[#232b32] rounded-xl p-5 border-l-2 border-l-[#FF5E5E]">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="text-[#FF5E5E]" size={18} />
            <span className="text-sm font-medium text-[#e6e9ec]">Road Utilization</span>
          </div>
          <div className="text-2xl font-mono text-white mb-1">82%</div>
          <div className="text-xs text-[#FF5E5E]">Approaching saturation at Junction 14</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#12171c] border border-[#232b32] rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-medium text-[#e6e9ec]">Directional Flow by Vehicle Type</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aggregatedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c232a" vertical={false} />
                <XAxis dataKey="type" tick={{ fill: "#7c8791", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#7c8791", fontSize: 11 }} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: '#1a2128'}} contentStyle={{ background: "#0a0d10", border: "1px solid #232b32", borderRadius: "8px", fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#7c8791' }} />
                <Bar dataKey="north" name="Northbound" stackId="a" fill="#37E6D1" radius={[0, 0, 4, 4]} />
                <Bar dataKey="south" name="Southbound" stackId="a" fill="#4ADE80" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#12171c] border border-[#232b32] rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-medium text-[#e6e9ec]">AI Traffic Congestion Forecasting</h3>
            <span className="text-[10px] font-mono uppercase bg-[#A855F7]/10 text-[#A855F7] px-2 py-1 rounded border border-[#A855F7]/20">Auto-ARIMA Model</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={predictionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c232a" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: "#7c8791", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#7c8791", fontSize: 11 }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ background: "#0a0d10", border: "1px solid #232b32", borderRadius: "8px", fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#7c8791' }} />
                <Line type="monotone" dataKey="actual" name="Actual Volume" stroke="#e6e9ec" strokeWidth={2} dot={{ r: 4, fill: '#e6e9ec', strokeWidth: 0 }} />
                <Line type="monotone" dataKey="predicted" name="AI Predicted" stroke="#A855F7" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
