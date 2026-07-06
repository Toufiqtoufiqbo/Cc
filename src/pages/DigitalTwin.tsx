import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Text, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { useTrafficData } from '../hooks/useTrafficData';

const CAMERA_NODES: Record<string, { x: number, z: number, dir: THREE.Vector3, color: string }> = {
  'CAM-01': { x: 2, z: -25, dir: new THREE.Vector3(0, 0, 1), color: '#37E6D1' },   // Northbound
  'CAM-02': { x: -2, z: 25, dir: new THREE.Vector3(0, 0, -1), color: '#FFB020' },  // Southbound
  'CAM-03': { x: -25, z: 2, dir: new THREE.Vector3(1, 0, 0), color: '#FF5EA8' },   // Eastbound
  'CAM-04': { x: 25, z: -2, dir: new THREE.Vector3(-1, 0, 0), color: '#4ADE80' },  // Westbound
  'CAM-05': { x: 2, z: -10, dir: new THREE.Vector3(0, 0, 1), color: '#9d4edd' },   // Junction North
  'CAM-06': { x: -2, z: 10, dir: new THREE.Vector3(0, 0, -1), color: '#0077b6' },  // Junction South
};

const VEHICLE_COLORS: Record<string, string> = {
  car: "#4ADE80",
  truck: "#37E6D1",
  bus: "#FFB020",
  motorcycle: "#FF5EA8",
};

// Real-time animated 3D vehicle model
function LiveVehicle({ position, type, speed, color, violation }: { position: THREE.Vector3, type: string, speed: number, color: string, violation: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Custom vehicle sizing based on class
  const dims = useMemo(() => {
    switch (type) {
      case 'truck': return [1.1, 0.9, 2.5] as [number, number, number];
      case 'bus': return [1.2, 1.1, 3.2] as [number, number, number];
      case 'motorcycle': return [0.4, 0.5, 1.0] as [number, number, number];
      default: return [0.8, 0.5, 1.8] as [number, number, number]; // car
    }
  }, [type]);

  // Smooth lerp onto live coordinate shifts
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.lerp(position, 0.15);
    }
  });

  const baseColor = VEHICLE_COLORS[type] || color || "#fff";

  return (
    <group>
      <mesh ref={meshRef} position={position} castShadow>
        <boxGeometry args={dims} />
        <meshStandardMaterial 
          color={violation ? "#FF5E5E" : baseColor} 
          roughness={0.1} 
          metalness={violation ? 0.9 : 0.6} 
          emissive={violation ? "#300000" : "#000000"}
        />
      </mesh>
    </group>
  );
}

function CityEnvironment() {
  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial color="#0f1318" roughness={0.9} />
      </mesh>
      
      {/* Roads */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[12, 150]} />
        <meshStandardMaterial color="#07090b" roughness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[12, 150]} />
        <meshStandardMaterial color="#07090b" roughness={0.5} />
      </mesh>

      {/* Camera landmark spheres */}
      {Object.entries(CAMERA_NODES).map(([id, node]) => (
        <group key={id} position={[node.x * 2.5, 3.5, node.z]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.1, 3.5]} />
            <meshStandardMaterial color="#232b32" metalness={0.9} />
          </mesh>
          <mesh position={[0, 1.8, 0]} castShadow>
            <sphereGeometry args={[0.3]} />
            <meshStandardMaterial color={node.color} emissive={node.color} emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}
      
      {/* Buildings */}
      {[...Array(25)].map((_, i) => {
        // Seeded building positions
        const angle = (i * 2 * Math.PI) / 25;
        const radius = 25 + (i * 2) % 35;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        if (Math.abs(x) < 10 && Math.abs(z) < 10) return null; // Keep central road clear
        
        const height = 8 + (i * 7) % 25;
        return (
          <mesh key={i} position={[x, height / 2, z]} castShadow receiveShadow>
            <boxGeometry args={[6, height, 6]} />
            <meshStandardMaterial color="#14191f" roughness={0.8} metalness={0.2} />
          </mesh>
        );
      })}
    </group>
  );
}

export function DigitalTwin() {
  const { events, summary, connected } = useTrafficData();

  // Create real-time 3D vehicles linked to live events in last 12 seconds
  const live3DVehicles = useMemo(() => {
    const now = Date.now() / 1000;
    const recent = events.filter(e => now - e.timestamp < 12);
    
    return recent.map(e => {
      const node = CAMERA_NODES[e.camera_id] || CAMERA_NODES['CAM-01'];
      const age = now - e.timestamp; // 0 to 12 seconds
      
      // Speed in meters/sec, scaled down for 3D visualization
      const speedScale = (e.speed_kmh / 3.6) * 0.8;
      
      // Spawn 40 meters behind and travel along direction vector
      const spawnOffset = -40;
      const travelDist = spawnOffset + (age * speedScale);
      
      // Calculate 3D coordinate along the lane
      const pos = new THREE.Vector3(node.x, 0.25, node.z)
        .addScaledVector(node.dir, travelDist);

      return {
        id: e.track_id,
        type: e.vehicle_type,
        speed: e.speed_kmh,
        color: e.color || '#37E6D1',
        position: pos,
        violation: e.violation
      };
    });
  }, [events]);

  const totalActiveInTwin = live3DVehicles.length;
  const avgSpeedInTwin = totalActiveInTwin > 0
    ? Math.round(live3DVehicles.reduce((sum, v) => sum + v.speed, 0) / totalActiveInTwin)
    : 0;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 h-[calc(100vh-8rem)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Digital Twin 
            <span className="text-xs ml-2 px-2 py-0.5 bg-[#37E6D1]/10 text-[#37E6D1] rounded border border-[#37E6D1]/20 font-mono uppercase tracking-wider">
              {connected ? "LIVE DATA SYNC" : "ACTIVE SIM"}
            </span>
          </h2>
          <p className="text-sm text-[#7c8791] mt-1">Real-time 3D telemetry visualization synchronized with AI camera detections</p>
        </div>
        <div className="flex gap-2 font-mono">
           <div className="px-3 py-1.5 bg-[#12171c] border border-[#232b32] text-[#7c8791] rounded text-xs flex items-center gap-2">
             <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#37E6D1] animate-pulse' : 'bg-[#FFB020]'}`} />
             {connected ? 'BROADCAST LINK: STABLE' : 'BROADCAST LINK: SYNTHETIC'}
           </div>
        </div>
      </div>

      <div className="bg-[#12171c] border border-[#232b32] rounded-xl flex-1 overflow-hidden relative">
        <Canvas shadows camera={{ position: [30, 25, 30], fov: 40 }}>
          <color attach="background" args={['#080a0d']} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[40, 60, 20]} castShadow intensity={1.2} shadow-mapSize={2048}>
            <orthographicCamera attach="shadow-camera" args={[-60, 60, 60, -60]} />
          </directionalLight>
          
          <CityEnvironment />
          
          {live3DVehicles.map((v) => (
            <LiveVehicle key={v.id} {...v} />
          ))}

          <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={120} blur={2.5} far={15} />
          <OrbitControls makeDefault minPolarAngle={0.1} maxPolarAngle={Math.PI / 2.1} />
        </Canvas>
        
        {/* Overlay HUD */}
        <div className="absolute top-6 left-6 z-10 bg-[#06080a]/90 backdrop-blur-md border border-[#232b32] p-5 rounded-xl pointer-events-none font-mono text-xs shadow-2xl">
          <div className="text-[10px] text-[#37E6D1] font-bold tracking-widest mb-1 uppercase">ITMS TWIN ENGINE v3.0</div>
          <div className="text-sm font-semibold text-white mb-3">Zone: Algiers-Center</div>
          <div className="space-y-2 text-[#7c8791] min-w-[180px]">
            <div className="flex justify-between border-b border-[#1c232a] pb-1">
              <span>Sync Mode:</span>
              <span className={connected ? "text-[#37E6D1] font-bold" : "text-[#FFB020]"}>
                {connected ? "LIVE FEED" : "SYNTHETIC"}
              </span>
            </div>
            <div className="flex justify-between border-b border-[#1c232a] pb-1">
              <span>Camera Nodes:</span>
              <span className="text-white font-bold">6 Online</span>
            </div>
            <div className="flex justify-between border-b border-[#1c232a] pb-1">
              <span>Tracked Now:</span>
              <span className="text-white font-bold">{totalActiveInTwin}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span>Avg Flow Speed:</span>
              <span className="text-white font-bold">{avgSpeedInTwin} km/h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
