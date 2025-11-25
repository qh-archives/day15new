const METALLIC_SILVER = '#d9dfe8'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text3D, Center, Preload, Lightformer, Environment, CameraControls, RenderTexture, ContactShadows, MeshTransmissionMaterial } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import './App.css'

const TYPED_LIMIT = 80

export default function App() {
  const [typed, setTyped] = useState([])

  const spawnTyped = (char) => {
    if (!char) return
    setTyped((prev) => {
      const next = [
        ...prev,
        {
          id:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`,
          char,
        },
      ]
      if (next.length > TYPED_LIMIT) {
        return next.slice(next.length - TYPED_LIMIT)
      }
      return next
    })
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const { key } = event
      if (key === 'Escape') {
        setTyped([])
        return
      }
      if (key === 'Backspace') {
        event.preventDefault()
        setTyped((prev) => prev.slice(0, -1))
        return
      }
      if (key === 'Enter') {
        event.preventDefault()
        spawnTyped('↵')
        return
      }
      if (key.length === 1) {
        spawnTyped(key)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <Canvas
      className="canvas"
      dpr={[1.5, 2]}
      camera={{ position: [-20, 40, 30], fov: 45, near: 1, far: 300 }}
    >
      <color attach="background" args={['#ffffff']} />
      <Suspense fallback={null}>
        <Physics gravity={[0, -60, 0]}>
          {typed.map((glyph) => (
            <FallingGlyph key={glyph.id} char={glyph.char} />
          ))}
          <CuboidCollider position={[0, -6, 0]} type="fixed" args={[100, 1, 100]} />
          <CuboidCollider position={[0, 0, -30]} type="fixed" args={[30, 100, 1]} />
          <CuboidCollider position={[0, 0, 10]} type="fixed" args={[30, 100, 1]} />
          <CuboidCollider position={[-30, 0, 0]} type="fixed" args={[1, 100, 30]} />
          <CuboidCollider position={[30, 0, 0]} type="fixed" args={[1, 100, 30]} />
        </Physics>

        <Environment
          files="https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/dancing_hall_1k.hdr"
          resolution={1024}
        >
          <group rotation={[-Math.PI / 3, 0, 0]}>
            <Lightformer
              intensity={4}
              rotation-x={Math.PI / 2}
              position={[0, 5, -9]}
              scale={[10, 10, 1]}
            />
            {[2, 0, 2, 0, 2, 0, 2, 0].map((x, i) => (
              <Lightformer
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                form="circle"
                intensity={4}
                rotation={[Math.PI / 2, 0, 0]}
                position={[x, 4, i * 4]}
                scale={[4, 1, 1]}
              />
            ))}
            <Lightformer
              intensity={2}
              rotation-y={Math.PI / 2}
              position={[-5, 1, -1]}
              scale={[50, 2, 1]}
            />
            <Lightformer
              intensity={2}
              rotation-y={-Math.PI / 2}
              position={[10, 1, 0]}
              scale={[50, 2, 1]}
            />
          </group>
        </Environment>
        <ContactShadows smooth={false} scale={100} position={[0, -5.05, 0]} blur={0.5} opacity={0.75} />
        <CameraControls makeDefault dollyToCursor minPolarAngle={0} maxPolarAngle={Math.PI / 2} />
        <Preload all />
      </Suspense>
    </Canvas>
  )
}

function Letter({ char, children, stencilBuffer = false, ...props }) {
  const main = useRef()
  const contents = useRef()
  const events = useThree((state) => state.events)
  const controls = useThree((state) => state.controls)

  useFrame(() => {
    if (contents.current && main.current) {
      contents.current.matrix.copy(main.current.matrixWorld)
    }
  })

  return (
    <RigidBody restitution={0.1} colliders="cuboid" {...props}>
      <Center ref={main}>
        <Text3D
          bevelEnabled
          font="/bold.blob"
          smooth={1}
          scale={0.08}
          size={50}
          height={3}
          curveSegments={10}
          bevelThickness={8}
          bevelSize={1.5}
          bevelOffset={0}
          bevelSegments={4}
          onDoubleClick={(event) => {
            event.stopPropagation()
            if (controls) {
              controls.fitToBox(main.current, true)
            }
          }}
        >
          {char}
          <MeshTransmissionMaterial clearcoat={1} samples={3} thickness={40} chromaticAberration={0.25} anisotropy={0.4}>
            <RenderTexture
              attach="buffer"
              stencilBuffer={stencilBuffer}
              width={512}
              height={512}
              compute={events.compute}
            >
              <color attach="background" args={['#4899c9']} />
              <group ref={contents} matrixAutoUpdate={false}>
                {children}
              </group>
              <Preload all />
            </RenderTexture>
          </MeshTransmissionMaterial>
        </Text3D>
      </Center>
    </RigidBody>
  )
}

function FallingGlyph({ char }) {
  const body = useRef()
  const { position, rotation, linear } = useMemo(
    () => ({
      position: [
        THREE.MathUtils.randFloatSpread(10),
        30 + Math.random() * 15,
        THREE.MathUtils.randFloatSpread(6),
      ],
      rotation: [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      ],
      linear: {
        x: THREE.MathUtils.randFloatSpread(6),
        y: -Math.random() * 5,
        z: THREE.MathUtils.randFloatSpread(2),
      },
    }),
    []
  )
  useEffect(() => {
    if (body.current) {
      body.current.setLinvel(linear)
    }
  }, [linear])

  return (
    <RigidBody
      ref={body}
      mass={0.5}
      restitution={0.4}
      colliders="cuboid"
      position={position}
      rotation={rotation}
    >
      <Text3D
        font="/bold.blob"
        size={50}
        height={3}
        curveSegments={10}
        bevelEnabled
        bevelThickness={8}
        bevelSize={1.5}
        bevelSegments={4}
        scale={0.08}
      >
        {char.toUpperCase()}
        <meshPhysicalMaterial
          color={METALLIC_SILVER}
          metalness={1}
          roughness={0.15}
          clearcoat={0.8}
          clearcoatRoughness={0.05}
          reflectivity={1}
        />
      </Text3D>
    </RigidBody>
  )
}
