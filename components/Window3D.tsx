"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, RoundedBox } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

const BRAND = "#f97316";
const FRAME = "#e5e0d8";

function RollerBlind() {
  const fabricRef = useRef<THREE.Mesh>(null);
  const slatsRef = useRef<THREE.Group>(null);

  // Animate the blind rolling up and down on a loop.
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // value oscillates 0.15 (almost up) -> 1 (fully down)
    const open = (Math.sin(t * 0.5) + 1) / 2; // 0..1
    const height = 0.6 + open * 2.6; // covered height
    if (fabricRef.current) {
      fabricRef.current.scale.y = height;
      fabricRef.current.position.y = 1.55 - height / 2;
    }
    if (slatsRef.current) {
      slatsRef.current.position.y = 1.55 - height / 2;
      slatsRef.current.scale.y = height;
    }
  });

  return (
    <group>
      {/* roller tube */}
      <mesh position={[0, 1.62, 0.06]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 2.5, 32]} />
        <meshStandardMaterial color={BRAND} metalness={0.4} roughness={0.3} />
      </mesh>

      {/* fabric */}
      <mesh ref={fabricRef} position={[0, 0, 0.04]}>
        <planeGeometry args={[2.4, 1, 1, 1]} />
        <meshStandardMaterial
          color="#fff3e6"
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* subtle slat lines on the fabric */}
      <group ref={slatsRef} position={[0, 0, 0.05]}>
        {Array.from({ length: 9 }).map((_, i) => (
          <mesh key={i} position={[0, -0.45 + (i / 8) * 0.9, 0]}>
            <planeGeometry args={[2.4, 0.012]} />
            <meshStandardMaterial color="#fdba74" transparent opacity={0.5} />
          </mesh>
        ))}
      </group>

      {/* bottom bar */}
      <mesh position={[0, -1.3, 0.07]}>
        <boxGeometry args={[2.42, 0.08, 0.05]} />
        <meshStandardMaterial color={BRAND} metalness={0.4} roughness={0.3} />
      </mesh>
    </group>
  );
}

function WindowFrame() {
  const barMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: FRAME, roughness: 0.6 }),
    []
  );

  return (
    <group>
      {/* outer frame using rounded boxes */}
      <RoundedBox args={[3, 0.22, 0.3]} radius={0.04} position={[0, 1.7, 0]} material={barMat} />
      <RoundedBox args={[3, 0.22, 0.3]} radius={0.04} position={[0, -1.7, 0]} material={barMat} />
      <RoundedBox args={[0.22, 3.6, 0.3]} radius={0.04} position={[-1.5, 0, 0]} material={barMat} />
      <RoundedBox args={[0.22, 3.6, 0.3]} radius={0.04} position={[1.5, 0, 0]} material={barMat} />
      {/* center mullion */}
      <RoundedBox args={[0.12, 3.6, 0.25]} radius={0.03} position={[0, 0, 0]} material={barMat} />

      {/* glass */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[2.9, 3.5]} />
        <meshStandardMaterial
          color="#cfe8ff"
          transparent
          opacity={0.3}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

function Scene() {
  return (
    <Float speed={1.2} rotationIntensity={0.25} floatIntensity={0.4}>
      <group rotation={[0, -0.3, 0]} scale={1}>
        <WindowFrame />
        <RollerBlind />
      </group>
    </Float>
  );
}

export default function Window3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.9} />
        <hemisphereLight intensity={0.5} groundColor="#dddddd" />
        <directionalLight position={[4, 6, 5]} intensity={1.6} />
        <directionalLight position={[-5, -2, 3]} intensity={0.5} color={BRAND} />
        <Scene />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2.6}
          maxPolarAngle={Math.PI / 1.7}
          minAzimuthAngle={-0.7}
          maxAzimuthAngle={0.7}
          autoRotate
          autoRotateSpeed={0.6}
        />
      </Suspense>
    </Canvas>
  );
}
