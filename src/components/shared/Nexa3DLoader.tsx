import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Float, MeshDistortMaterial, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

function Scene() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Group>(null!);

  // Rotation and animations are removed to align with static loading states.

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#00f2ff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#7000ff" />
      
      <Float speed={0} rotationIntensity={0} floatIntensity={0}>
        {/* Central Static Core */}
        <mesh ref={meshRef}>
          <octahedronGeometry args={[1, 0]} />
          <MeshDistortMaterial
            color="#00f2ff"
            speed={0}
            distort={0}
            radius={1}
            emissive="#00f2ff"
            emissiveIntensity={0.5}
          />
        </mesh>
      </Float>

      {/* Orbiting Wireframe Rings */}
      <group ref={ringRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2, 0.02, 16, 100]} />
          <meshStandardMaterial color="#00f2ff" transparent opacity={0.3} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[2.2, 0.01, 16, 100]} />
          <meshStandardMaterial color="#00f2ff" transparent opacity={0.2} />
        </mesh>
      </group>

      {/* Starfield Particles */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(300).map(() => (Math.random() - 0.5) * 10), 3]}
            count={100}
            array={new Float32Array(300).map(() => (Math.random() - 0.5) * 10)}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.05} color="#ffffff" transparent opacity={0.5} />
      </points>
    </>
  );
}

/**
 * Nexa3DLoader - A futuristic static 3D loading experience.
 */
export function Nexa3DLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="h-64 w-64 cursor-wait">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 5]} />
          <Scene />
        </Canvas>
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-black uppercase tracking-[0.5em] text-primary">
          Nexa Dimension
        </span>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 bg-primary" />
        </div>
      </div>
    </div>
  );
}
