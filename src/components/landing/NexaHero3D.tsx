import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';

function AnimatedSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <Sphere ref={meshRef} args={[1, 100, 200]} scale={2}>
        <MeshDistortMaterial
          color="#3b82f6"
          attach="material"
          distort={0.4}
          speed={4}
          roughness={0}
          metalness={1}
        />
      </Sphere>
    </Float>
  );
}

function Rig() {
  return useFrame((state) => {
    state.camera.position.lerp(new THREE.Vector3(state.mouse.x * 2, state.mouse.y * 2, 5), 0.05);
    state.camera.lookAt(0, 0, 0);
  });
}

export function NexaHero3D() {
  return (
    <div className="w-full h-[500px] lg:h-[600px] relative">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={75} />
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <AnimatedSphere />
        
        <Environment preset="city" />
        <Rig />
      </Canvas>
      
      {/* Overlay glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
    </div>
  );
}
