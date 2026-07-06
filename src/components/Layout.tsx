import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Video, BarChart3, Settings, AlertTriangle, ShieldAlert, Map, Bell, Box, Terminal } from 'lucide-react';
import clsx from 'clsx';

export function Layout() {
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const navItems = [
    { name: 'System Overview', path: '/', icon: LayoutDashboard },
    { name: 'Digital Twin', path: '/twin', icon: Box },
    { name: 'Geospatial Map', path: '/map', icon: Map },
    { name: 'Camera Network', path: '/cameras', icon: Video },
    { name: 'Deep Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Alert Center', path: '/alerts', icon: Bell },
    { name: 'Infraction Log', path: '/violations', icon: AlertTriangle },
    { name: 'API & SDK', path: '/api', icon: Terminal },
    { name: 'Configuration', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-[#06080a] text-[#e6e9ec] font-sans selection:bg-[#37E6D1]/30 selection:text-white">
      {/* Premium Sidebar */}
      <aside className="w-64 flex flex-col border-r border-[#1a2128] bg-[#0a0d10] shrink-0 relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
        <div className="h-16 flex items-center px-6 border-b border-[#1a2128]">
          <ShieldAlert className="text-[#37E6D1] mr-3 drop-shadow-[0_0_8px_rgba(55,230,209,0.5)]" size={22} />
          <h1 className="font-mono text-sm tracking-[0.2em] font-bold text-white">TRAFFIC<span className="text-[#37E6D1]">.SYS</span></h1>
        </div>
        
        <nav className="flex-1 py-6 px-3 flex flex-col gap-1.5 overflow-y-auto">
          <div className="px-3 mb-2">
            <span className="text-[10px] font-mono text-[#7c8791] uppercase tracking-widest">Main Menu</span>
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-[#121920] text-[#37E6D1] border border-[#1e2a36] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" 
                  : "text-[#8a95a0] hover:bg-[#0d1216] hover:text-[#e6e9ec] border border-transparent"
              )}
            >
              <item.icon size={18} className={clsx("transition-transform duration-200")} />
              {item.name}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-5 border-t border-[#1a2128] bg-[#06080a]/50">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#7c8791] mb-2">
            <span>UTC TIME</span>
            <span className="text-[#e6e9ec]">{clock.toISOString().substring(11, 19)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-[#7c8791]">
            <span>SYSTEM</span>
            <span className="text-[#4ADE80] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse"></span> ONLINE
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#06080a] relative">
        {/* Subtle grid background for enterprise feel */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        <header className="h-16 flex items-center px-8 border-b border-[#1a2128] bg-[#0a0d10]/80 backdrop-blur-md shrink-0 justify-between relative z-10">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-[#121920] border border-[#1e2a36] px-3 py-1.5 rounded-full">
               <div className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse shadow-[0_0_8px_#4ADE80]" />
               <span className="text-[10px] font-mono text-[#4ADE80] tracking-widest">NODE ALGIERS-01</span>
             </div>
          </div>
          
          <div className="flex items-center gap-5">
            <button className="relative text-[#8a95a0] hover:text-white transition-colors">
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF5E5E] rounded-full border border-[#0a0d10]"></span>
            </button>
            <div className="w-px h-6 bg-[#1a2128]"></div>
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right hidden md:block">
                <div className="text-sm font-medium text-[#e6e9ec] group-hover:text-white transition-colors">System Admin</div>
                <div className="text-[10px] text-[#7c8791] font-mono uppercase">Superuser Role</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#121920] border border-[#1e2a36] flex items-center justify-center overflow-hidden group-hover:border-[#37E6D1]/50 transition-colors">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin2&backgroundColor=121920" alt="Admin" className="w-full h-full" />
              </div>
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
