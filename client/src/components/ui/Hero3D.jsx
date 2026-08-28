import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, MeshDistortMaterial, Float, Stars, TorusKnot, Icosahedron } from '@react-three/drei'

function AnimatedShapes() {
  const group = useRef()
  
  useFrame((state) => {
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2
    group.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.2) * 0.2
  })

  return (
    <group ref={group}>
      <Float speed={2} rotationIntensity={1} floatIntensity={2}>
        <Icosahedron args={[1, 1]} position={[-3, 1, -2]}>
          <meshStandardMaterial color="#3b82f6" wireframe opacity={0.3} transparent />
        </Icosahedron>
      </Float>
      
      <Float speed={3} rotationIntensity={2} floatIntensity={1.5}>
        <TorusKnot args={[0.8, 0.2, 100, 16]} position={[3, -1, -1]}>
          <MeshDistortMaterial color="#8b5cf6" envMapIntensity={1} clearcoat={1} clearcoatRoughness={0.1} metalness={0.8} roughness={0.2} speed={5} distort={0.2} />
        </TorusKnot>
      </Float>

      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={3}>
        <Sphere args={[1.5, 64, 64]} position={[0, 0, -3]}>
          <MeshDistortMaterial color="#0ea5e9" envMapIntensity={1} clearcoat={1} clearcoatRoughness={0} metalness={0.9} roughness={0.1} speed={2} distort={0.4} />
        </Sphere>
      </Float>
    </group>
  )
}

export default function Hero3D() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-10, -10, -5]} intensity={1} color="#3b82f6" />
        <pointLight position={[10, -10, -5]} intensity={1} color="#8b5cf6" />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <AnimatedShapes />
      </Canvas>
    </div>
  )
}
