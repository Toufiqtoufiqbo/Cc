import React, { useState } from 'react';
import { Save, Server, Shield, Bell, HardDrive, Database, MonitorPlay, Users } from 'lucide-react';

export function Settings() {
  const [activeTab, setActiveTab] = useState('api');

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">System Configuration</h2>
          <p className="text-sm text-[#7c8791] mt-1">Manage global preferences and integration parameters</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#37E6D1] hover:bg-[#2bc4b1] text-[#0a0d10] font-medium rounded-lg text-sm transition-colors">
          <Save size={16} /> Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left border \${activeTab === 'api' ? 'bg-[#1a2128] text-[#37E6D1] border-[#232b32]' : 'text-[#7c8791] border-transparent hover:bg-[#1a2128]/50 hover:text-white'}`}>
            <Server size={18} /> API & Endpoints
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left border \${activeTab === 'security' ? 'bg-[#1a2128] text-[#37E6D1] border-[#232b32]' : 'text-[#7c8791] border-transparent hover:bg-[#1a2128]/50 hover:text-white'}`}>
            <Shield size={18} /> Security & Roles
          </button>
          <button 
            onClick={() => setActiveTab('operator')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left border \${activeTab === 'operator' ? 'bg-[#1a2128] text-[#37E6D1] border-[#232b32]' : 'text-[#7c8791] border-transparent hover:bg-[#1a2128]/50 hover:text-white'}`}>
            <MonitorPlay size={18} /> Operations Center
          </button>
        </div>

        <div className="md:col-span-3 bg-[#12171c] border border-[#232b32] rounded-xl p-6 flex flex-col gap-6">
          {activeTab === 'api' && (
            <>
              <div className="flex items-center justify-between pb-4 border-b border-[#1c232a]">
                <div>
                  <h3 className="text-base font-medium text-white">Backend Connectivity</h3>
                  <p className="text-xs text-[#7c8791] mt-1">Configure how the dashboard receives inference data.</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#4ADE80]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse"></div>
                  Connected
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#7c8791] uppercase tracking-wider">WebSocket URL</label>
                  <input 
                    type="text" 
                    defaultValue="ws://localhost:3000/ws" 
                    className="bg-[#0a0d10] border border-[#232b32] rounded-md px-3 py-2 text-sm text-[#e6e9ec] focus:outline-none focus:border-[#37E6D1]/50 focus:ring-1 focus:ring-[#37E6D1]/50"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#7c8791] uppercase tracking-wider">REST API Base</label>
                  <input 
                    type="text" 
                    defaultValue="http://localhost:3000" 
                    className="bg-[#0a0d10] border border-[#232b32] rounded-md px-3 py-2 text-sm text-[#e6e9ec] focus:outline-none focus:border-[#37E6D1]/50 focus:ring-1 focus:ring-[#37E6D1]/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#1c232a] mt-2">
                <div>
                  <h3 className="text-base font-medium text-white">Simulation Fallback</h3>
                  <p className="text-xs text-[#7c8791] mt-1">Automatically generate realistic mock data when connection is lost.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-[#1a2128] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#7c8791] peer-checked:after:bg-[#0a0d10] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#37E6D1]"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-[#1c232a]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1a2128] flex items-center justify-center text-[#7c8791]">
                    <HardDrive size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-white">Database Migration</h3>
                    <p className="text-xs text-[#7c8791] mt-1">Currently using SQLite. Prepare for PostgreSQL migration.</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 border border-[#232b32] bg-[#1a2128] hover:bg-[#1a2128]/80 rounded text-xs text-[#e6e9ec] transition-colors">
                  Begin Migration
                </button>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <div className="flex items-center justify-between pb-4 border-b border-[#1c232a]">
                <div>
                  <h3 className="text-base font-medium text-white">Identity & Access Management</h3>
                  <p className="text-xs text-[#7c8791] mt-1">Configure SSO, LDAP, and OAuth2 integrations.</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-[#1a2128] border border-[#232b32] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <Shield size={16} className="text-[#A855F7]" /> Enterprise SSO (SAML/OIDC)
                    </div>
                    <span className="text-[10px] font-mono uppercase bg-[#4ADE80]/10 text-[#4ADE80] px-2 py-0.5 rounded border border-[#4ADE80]/20">Active</span>
                  </div>
                  <p className="text-xs text-[#7c8791] mb-3">Enforce corporate identity for dashboard access.</p>
                  <button className="text-xs text-[#37E6D1] hover:underline">Configure Identity Provider</button>
                </div>

                <div className="bg-[#1a2128] border border-[#232b32] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <Users size={16} className="text-[#37E6D1]" /> Role-Based Access Control (RBAC)
                    </div>
                  </div>
                  <p className="text-xs text-[#7c8791] mb-3">Manage permissions for Operators, Analysts, and Admins.</p>
                  <div className="flex gap-2">
                    <span className="text-[10px] border border-[#232b32] bg-[#0a0d10] px-2 py-1 rounded text-[#e6e9ec]">Admin: 2</span>
                    <span className="text-[10px] border border-[#232b32] bg-[#0a0d10] px-2 py-1 rounded text-[#e6e9ec]">Operator: 14</span>
                    <span className="text-[10px] border border-[#232b32] bg-[#0a0d10] px-2 py-1 rounded text-[#e6e9ec]">Analyst: 8</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'operator' && (
            <>
               <div className="flex items-center justify-between pb-4 border-b border-[#1c232a]">
                <div>
                  <h3 className="text-base font-medium text-white">Control Center Configuration</h3>
                  <p className="text-xs text-[#7c8791] mt-1">Optimize UI for wall-mounted displays and 24/7 operators.</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <h3 className="text-sm font-medium text-white">Wall Display Mode</h3>
                  <p className="text-xs text-[#7c8791] mt-1">Maximizes contrast, hides navigation menus, scales typography.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-[#1a2128] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#7c8791] peer-checked:after:bg-[#0a0d10] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A855F7]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#1c232a]">
                <div>
                  <h3 className="text-sm font-medium text-white">Auto-Acknowledge Low Severity</h3>
                  <p className="text-xs text-[#7c8791] mt-1">Automatically clear low severity alerts after 5 minutes.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-[#1a2128] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#7c8791] peer-checked:after:bg-[#0a0d10] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#37E6D1]"></div>
                </label>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
