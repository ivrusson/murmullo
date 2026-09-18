import * as THREE from 'three';
import type { DictationSceneMode } from '@/hooks/useDictationScene';

export type ChamberMode = DictationSceneMode;

export interface ChamberHandle {
  setMode: (mode: ChamberMode) => void;
  setLevel: (level: number) => void;
  setColorMode: (mode: 'light' | 'dark') => void;
  resize: () => void;
  dispose: () => void;
}

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uLevel;
  uniform float uAmp;
  uniform float uSpeed;
  varying vec2 vUv;
  varying float vLift;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float r = length(pos.xy);
    float breath = sin(uTime * 0.55) * 0.07;
    float murmur = sin(pos.x * 2.4 + uTime * uSpeed) * cos(pos.y * 1.8 - uTime * 0.7);
    float ring = sin(r * 7.5 - uTime * (2.2 + uLevel * 6.0));
    float lift = murmur * uAmp + breath + ring * uLevel * 0.55;
    pos.z += lift * 0.42;
    vLift = lift;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uCopper;
  uniform vec3 uLive;
  uniform vec3 uInk;
  uniform float uRecord;
  uniform float uFade;
  varying vec2 vUv;
  varying float vLift;

  void main() {
    float edge = smoothstep(0.98, 0.18, length(vUv - 0.5) * 1.85);
    vec3 tone = mix(uCopper, uLive, uRecord);
    vec3 color = mix(uInk, tone, 0.55 + vLift * 0.8);
    float gridX = abs(fract(vUv.x * 36.0) - 0.5);
    float gridY = abs(fract(vUv.y * 36.0) - 0.5);
    float wire = smoothstep(0.46, 0.02, min(gridX, gridY));
    vec3 finalColor = mix(color, tone, wire * 0.55);
    gl_FragColor = vec4(finalColor, edge * uFade);
  }
`;

function hexToVec3(hex: string): THREE.Vector3 {
  const color = new THREE.Color(hex);
  return new THREE.Vector3(color.r, color.g, color.b);
}

export function createVoiceChamber(
  canvas: HTMLCanvasElement,
  options: { reducedMotion: boolean; colorMode: 'light' | 'dark' }
): ChamberHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0, -3.4, 6.2);
  camera.lookAt(0, 0, 0);

  const uniforms = {
    uTime: { value: 0 },
    uLevel: { value: 0 },
    uAmp: { value: options.reducedMotion ? 0.04 : 0.18 },
    uSpeed: { value: options.reducedMotion ? 0 : 0.9 },
    uRecord: { value: 0 },
    uFade: { value: 1 },
    uCopper: { value: hexToVec3('#C9955A') },
    uLive: { value: hexToVec3('#4F9B8C') },
    uInk: { value: hexToVec3(options.colorMode === 'light' ? '#1F2A36' : '#E7E2D6') },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 8.4, 96, 96), material);
  mesh.rotation.x = -0.72;
  scene.add(mesh);

  let mode: ChamberMode = 'idle';
  let targetLevel = 0;
  let targetRecord = 0;
  let targetAmp = uniforms.uAmp.value;
  let raf = 0;
  let last = performance.now();
  let disposed = false;

  const resize = () => {
    const parent = canvas.parentElement;
    const width = parent?.clientWidth || canvas.clientWidth || 1;
    const height = parent?.clientHeight || canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const applyMode = (next: ChamberMode) => {
    mode = next;
    if (next === 'recording') {
      targetAmp = options.reducedMotion ? 0.06 : 0.34;
      targetRecord = 1;
      uniforms.uSpeed.value = options.reducedMotion ? 0 : 1.6;
      return;
    }
    if (next === 'processing') {
      targetAmp = options.reducedMotion ? 0.05 : 0.22;
      targetRecord = 0.55;
      uniforms.uSpeed.value = options.reducedMotion ? 0 : 2.4;
      return;
    }
    if (next === 'complete') {
      targetAmp = 0.08;
      targetRecord = 0.2;
      uniforms.uSpeed.value = options.reducedMotion ? 0 : 0.5;
      return;
    }
    if (next === 'error') {
      targetAmp = 0.04;
      targetRecord = 0;
      uniforms.uSpeed.value = 0;
      return;
    }
    targetAmp = options.reducedMotion ? 0.04 : 0.16;
    targetRecord = 0;
    uniforms.uSpeed.value = options.reducedMotion ? 0 : 0.9;
  };

  const tick = (now: number) => {
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    uniforms.uTime.value += dt;
    uniforms.uLevel.value += (targetLevel - uniforms.uLevel.value) * 0.12;
    uniforms.uRecord.value += (targetRecord - uniforms.uRecord.value) * 0.08;
    uniforms.uAmp.value += (targetAmp - uniforms.uAmp.value) * 0.08;
    renderer.render(scene, camera);
    if (!options.reducedMotion) {
      raf = window.requestAnimationFrame(tick);
    }
  };

  resize();
  renderer.render(scene, camera);
  if (!options.reducedMotion) {
    raf = window.requestAnimationFrame(tick);
  }

  return {
    setMode: applyMode,
    setLevel: (level: number) => {
      targetLevel = mode === 'recording' ? Math.max(0, Math.min(1, level)) : 0.08;
    },
    setColorMode: (colorMode: 'light' | 'dark') => {
      uniforms.uInk.value = hexToVec3(colorMode === 'light' ? '#1F2A36' : '#E7E2D6');
      if (options.reducedMotion) {
        renderer.render(scene, camera);
      }
    },
    resize,
    dispose: () => {
      disposed = true;
      window.cancelAnimationFrame(raf);
      mesh.geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
