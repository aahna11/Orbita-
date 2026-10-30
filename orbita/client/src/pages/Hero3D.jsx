import { useMemo, useRef } from 'react'; import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, MeshReflectorMaterial, MeshTransmissionMaterial } from '@react-three/drei';
const COLORS = ['#F0507A', '#A99BEA', '#5FD3C8', '#2FBF8F', '#F2A93B'];
function Sculpture() {
  const g = useRef(), orbit = useRef(), bits = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ a: i / 16 * Math.PI * 2, r: 2.1 + (i % 3) * .35, y: ((i * 7) % 5) * .3 - .4, s: .09 + (i % 4) * .04, c: COLORS[i % 5], gem: i % 3 === 0 })), []);
  useFrame((s, dt) => { g.current.rotation.y += (s.pointer.x * .6 - g.current.rotation.y) * .05; g.current.rotation.x += (-s.pointer.y * .25 - g.current.rotation.x) * .05; orbit.current.rotation.y += dt * .25; });
  return (<group ref={g}><Float speed={1.2} floatIntensity={.5}>
    {[0, .55, 1.1].map((y, i) => <mesh key={i} position={[0, y - .4, 0]} rotation={[Math.PI / 2, 0, 0]} scale={1 - i * .18}><torusGeometry args={[1.1, .22, 32, 64]} />
      <MeshTransmissionMaterial samples={4} resolution={256} thickness={.5} roughness={.08} chromaticAberration={.04} iridescence={1} backside={false} /></mesh>)}
    <mesh position={[0, .15, 0]}><sphereGeometry args={[.55, 48, 48]} /><meshPhysicalMaterial color="#f4f1ff" clearcoat={1} iridescence={1} roughness={.12} /></mesh>
    <mesh rotation={[1.2, .3, 0]} position={[0, .15, 0]}><torusGeometry args={[1.7, .045, 24, 96]} /><meshStandardMaterial color="#e8ecf2" metalness={1} roughness={.05} /></mesh>
    <group ref={orbit}>{bits.map((b, i) => <mesh key={i} position={[Math.cos(b.a) * b.r, b.y, Math.sin(b.a) * b.r]}>{b.gem ? <octahedronGeometry args={[b.s * 1.4]} /> : <sphereGeometry args={[b.s, 24, 24]} />}
      <meshPhysicalMaterial color={b.c} clearcoat={1} roughness={.1} /></mesh>)}</group></Float></group>);
}
export default function Hero3D() {
  return (<Canvas dpr={[1, 2]} camera={{ position: [0, .9, 6.5], fov: 38 }} className="hero-canvas" aria-hidden="true"><ambientLight intensity={.6} /><directionalLight position={[3, 5, 3]} intensity={1.2} />
    <Environment preset="studio" /><Sculpture />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.3, 0]}><planeGeometry args={[40, 40]} />
      <MeshReflectorMaterial blur={[300, 100]} resolution={512} mixBlur={1} mixStrength={35} mirror={.6} color="#c9d2e3" roughness={1} depthScale={1.1} /></mesh></Canvas>);
}
