import * as THREE from 'three';
import { MurmulloEngine, type MurmulloEngineOptions } from '../engine';
import { createLoop, type MurmulloRenderer } from '../renderer';
import type {
  MurmulloParams,
  MurmulloParamsPatch,
  MurmulloState,
} from '../types';
import { BODY_FRAGMENT, BODY_VERTEX } from './shaders';

export interface Murmullo3DOptions extends MurmulloEngineOptions {
  /**
   * Icosphere subdivision (three's PolyhedronGeometry `detail`: faces =
   * 20 · (detail + 1)²). 16 ≈ 5.8k faces (light), 28 ≈ 17k (smooth, default).
   */
  detail?: number;
  /** Cap device pixel ratio for performance. */
  maxPixelRatio?: number;
  /** Start the animation loop immediately (default true). */
  autoStart?: boolean;
}

const SPARKLE_COUNT = 6;
const RAY_COUNT = 5;
const TRAIL_COUNT = 3;

function makeGlowTexture(size = 128, soft = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(
      soft ? 0.18 : 0.08,
      soft ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.85)'
    );
    g.addColorStop(
      0.45,
      soft ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.28)'
    );
    g.addColorStop(
      0.75,
      soft ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)'
    );
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeStarTexture(size = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const c = size / 2;
    const r = size * 0.46;
    const k = r * 0.22;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(c, c - r);
    ctx.quadraticCurveTo(c + k * 0.4, c - k * 0.4, c + r, c);
    ctx.quadraticCurveTo(c + k * 0.4, c + k * 0.4, c, c + r);
    ctx.quadraticCurveTo(c - k * 0.4, c + k * 0.4, c - r, c);
    ctx.quadraticCurveTo(c - k * 0.4, c - k * 0.4, c, c - r);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function col(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

interface Eye {
  group: THREE.Group;
  open: THREE.Mesh;
  smile: THREE.Mesh;
  glow: THREE.Sprite;
  side: -1 | 1;
}

/**
 * three.js renderer for the Murmullo mascot. Fully self-contained: creates a
 * WebGL renderer on the given canvas, drives its own `MurmulloEngine` and
 * exposes the common `MurmulloRenderer` interface.
 */
export function createMurmullo3D(
  canvas: HTMLCanvasElement,
  options: Murmullo3DOptions = {}
): MurmulloRenderer {
  const engine = new MurmulloEngine(options);
  let params: MurmulloParams = engine.params;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, options.maxPixelRatio ?? 2)
  );
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  // frames ±2.3 body radii vertically, matching the SVG viewBox
  const CAMERA_DISTANCE = 8.4;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.7, CAMERA_DISTANCE);
  camera.lookAt(0, -0.12, 0);

  // ---------------------------------------------------------------- body
  const uniforms = {
    uPhase: { value: 0 },
    uFlowAmp: { value: 0.6 },
    uLevel: { value: 0 },
    uPulse: { value: 0 },
    uAsymmetry: { value: params.shape.asymmetry },
    uLobeFreq: { value: params.shape.lobeFrequency },
    uSeed: { value: params.shape.seed },
    uAxes: {
      value: new THREE.Vector3(params.shape.aspect, 1, params.shape.depth),
    },
    uCore: { value: col(params.palette.core) },
    uDeep: { value: col(params.palette.deep) },
    uRim: { value: col(params.palette.rim) },
    uGlowA: { value: col(params.palette.glowA) },
    uGlowB: { value: col(params.palette.glowB) },
    uGhostColor: { value: col(params.palette.ghost) },
    uTranslucency: { value: params.material.translucency },
    uIridescence: { value: params.material.iridescence },
    uRimStrength: { value: params.material.rim },
    uGloss: { value: params.material.gloss },
    uGlow: { value: 0.35 },
    uOpacity: { value: 1 },
    uGhost: { value: 0 },
    uHue: { value: 0 },
    uTime: { value: 0 },
  };

  const bodyMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: BODY_VERTEX,
    fragmentShader: BODY_FRAGMENT,
    transparent: true,
    depthWrite: true,
    side: THREE.FrontSide,
  });
  const bodyGeometry = new THREE.IcosahedronGeometry(1, options.detail ?? 28);
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.renderOrder = 1;

  const bodyGroup = new THREE.Group();
  bodyGroup.add(body);
  scene.add(bodyGroup);

  // ---------------------------------------------------------------- eyes
  const glowTexture = makeGlowTexture(128);
  const eyeMaterial = new THREE.MeshBasicMaterial({
    color: col(params.palette.eye),
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const eyeGlowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: col(params.palette.eye),
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const openGeometry = new THREE.SphereGeometry(1, 28, 18);
  const smileGeometry = new THREE.TorusGeometry(1, 0.16, 8, 32, Math.PI * 0.85);

  const makeEye = (side: -1 | 1): Eye => {
    const group = new THREE.Group();
    const open = new THREE.Mesh(openGeometry, eyeMaterial);
    open.renderOrder = 20;
    const smile = new THREE.Mesh(smileGeometry, eyeMaterial);
    smile.renderOrder = 20;
    smile.rotation.z = Math.PI / 2 - (Math.PI * 0.85) / 2;
    const glow = new THREE.Sprite(eyeGlowMaterial);
    glow.renderOrder = 19;
    group.add(glow, open, smile);
    bodyGroup.add(group);
    return { group, open, smile, glow, side };
  };
  const eyes: Eye[] = [makeEye(-1), makeEye(1)];

  // ---------------------------------------------------------------- aura & shadow
  const auraTexture = makeGlowTexture(256, true);
  const auraMaterial = new THREE.MeshBasicMaterial({
    map: auraTexture,
    color: col(params.palette.aura),
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const aura = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), auraMaterial);
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = -1.32;
  aura.renderOrder = 0;
  scene.add(aura);

  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: auraTexture,
    color: col(params.palette.core),
    transparent: true,
    depthWrite: false,
    depthTest: false,
    opacity: 0.16,
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.31;
  shadow.renderOrder = 0;
  scene.add(shadow);

  // ---------------------------------------------------------------- accents
  const accents = new THREE.Group();
  scene.add(accents);

  const arcMaterial = new THREE.MeshBasicMaterial({
    color: col(params.palette.rim),
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const arcGeometry = new THREE.TorusGeometry(1.42, 0.026, 6, 40, 0.8);
  const arcs = [-1, 1].map(side => {
    const arc = new THREE.Mesh(arcGeometry, arcMaterial);
    arc.rotation.z = side > 0 ? -0.4 : Math.PI - 0.4;
    // sit in front of the body so perspective doesn't hide them
    arc.position.z = 0.95;
    accents.add(arc);
    return arc;
  });

  const starTexture = makeStarTexture(128);
  const sparkleMaterials = Array.from({ length: SPARKLE_COUNT }, (_, i) => {
    const key = (['glowA', 'glowB', 'rim'] as const)[i % 3];
    return new THREE.SpriteMaterial({
      map: starTexture,
      color: col(params.palette[key]),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
    });
  });
  const sparkles = sparkleMaterials.map(material => {
    const sprite = new THREE.Sprite(material);
    sprite.scale.setScalar(0.22);
    accents.add(sprite);
    return sprite;
  });

  const rayMaterial = new THREE.LineBasicMaterial({
    color: col(params.palette.deep),
    transparent: true,
    opacity: 0,
    depthTest: false,
  });
  const rayPositions = new Float32Array(RAY_COUNT * 2 * 3);
  const rayGeometry = new THREE.BufferGeometry();
  rayGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(rayPositions, 3)
  );
  const rays = new THREE.LineSegments(rayGeometry, rayMaterial);
  accents.add(rays);

  const trailMaterials = Array.from(
    { length: TRAIL_COUNT },
    () =>
      new THREE.MeshBasicMaterial({
        color: col(params.palette.ghost),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
  );
  const trail = trailMaterials.map((material, i) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.2 - i * 0.05, 16, 12),
      material
    );
    accents.add(mesh);
    return mesh;
  });

  // ---------------------------------------------------------------- helpers
  const applyParams = () => {
    params = engine.params;
    const { palette, shape, material } = params;
    uniforms.uAsymmetry.value = shape.asymmetry;
    uniforms.uLobeFreq.value = shape.lobeFrequency;
    uniforms.uSeed.value = shape.seed;
    uniforms.uAxes.value.set(shape.aspect, 1, shape.depth);
    uniforms.uCore.value.set(palette.core);
    uniforms.uDeep.value.set(palette.deep);
    uniforms.uRim.value.set(palette.rim);
    uniforms.uGlowA.value.set(palette.glowA);
    uniforms.uGlowB.value.set(palette.glowB);
    uniforms.uGhostColor.value.set(palette.ghost);
    uniforms.uTranslucency.value = material.translucency;
    uniforms.uIridescence.value = material.iridescence;
    uniforms.uRimStrength.value = material.rim;
    uniforms.uGloss.value = material.gloss;
    auraMaterial.color.set(palette.aura);
    shadowMaterial.color.set(palette.core);
    arcMaterial.color.set(palette.rim);
    rayMaterial.color.set(palette.deep);
    sparkleMaterials.forEach((m, i) => {
      const key = (['glowA', 'glowB', 'rim'] as const)[i % 3];
      m.color.set(palette[key]);
    });
    trailMaterials.forEach(m => m.color.set(palette.ghost));
  };

  const normal = new THREE.Vector3();
  const target = new THREE.Vector3();
  const ghostColor = new THREE.Color();

  const placeEye = (eye: Eye, pose: ReturnType<MurmulloEngine['update']>) => {
    const { eyes: e, shape } = params;
    const size = e.size * pose.eyeSize;
    const x = eye.side * e.spacing * pose.eyeSpacing + pose.eyeLookX * 0.1;
    const y = e.height + pose.eyeLookY * 0.08;
    const a = shape.aspect;
    const c = shape.depth;
    const inside = 1 - (x * x) / (a * a) - y * y;
    const z = c * Math.sqrt(Math.max(0.08, inside)) + 0.07;
    eye.group.position.set(x, y, z);
    normal.set(x / (a * a), y, z / (c * c)).normalize();
    target.copy(eye.group.position).add(normal);
    eye.group.lookAt(target);
    const tilt = THREE.MathUtils.degToRad(e.tilt);
    eye.group.rotateZ(eye.side * tilt - eye.side * pose.eyeDroop * 0.45);

    const open = Math.max(0.001, pose.eyeOpen);
    eye.open.scale.set(
      size * e.aspect * (1 + (1 - Math.min(1, open)) * 0.15),
      size * open,
      size * 0.35
    );
    eye.open.visible = open > 0.01;

    const smile = pose.eyeSmile;
    eye.smile.scale.set(size * 0.95 * smile, size * 0.7 * smile, size * 0.5);
    eye.smile.visible = smile > 0.02;

    const glowStrength =
      e.glow * (0.6 + pose.glow * 0.6) * Math.max(open, smile * 0.8);
    eye.glow.scale.setScalar(size * 4.2);
    eyeGlowMaterial.opacity = glowStrength * 0.55 * pose.opacity;
    eye.glow.position.z = 0.02;
  };

  const step = (dt: number) => {
    const pose = engine.update(dt);
    const { shape } = params;

    // body transform
    bodyGroup.position.set(pose.offsetX, pose.offsetY, 0);
    bodyGroup.rotation.z = pose.tilt;
    bodyGroup.scale.set(
      pose.scaleX,
      pose.scaleY,
      (pose.scaleX + pose.scaleY) / 2
    );

    uniforms.uPhase.value = pose.flowPhase;
    uniforms.uFlowAmp.value = pose.flowAmp;
    uniforms.uLevel.value = pose.level;
    uniforms.uPulse.value = pose.pulse;
    uniforms.uGlow.value = pose.glow;
    uniforms.uOpacity.value = pose.opacity;
    uniforms.uGhost.value = pose.ghost;
    uniforms.uHue.value = pose.hueShift;
    uniforms.uTime.value = pose.time;

    // eyes turn ghostly blue while fading away
    eyeMaterial.color
      .set(params.palette.eye)
      .lerp(ghostColor.set(params.palette.ghost), pose.ghost * 0.75);
    eyeGlowMaterial.color.copy(eyeMaterial.color);
    eyes.forEach(eye => placeEye(eye, pose));

    // aura follows the body, brightens with glow
    const auraScale = 1 + pose.level * 0.2;
    aura.position.x = pose.offsetX * 0.6;
    aura.scale.set(
      shape.aspect * 2.6 * auraScale * pose.scaleX,
      1.7 * auraScale,
      1
    );
    auraMaterial.opacity =
      (0.22 + pose.glow * 0.4) * pose.opacity * (1 - pose.ghost * 0.6);
    shadow.position.x = pose.offsetX * 0.8;
    shadow.scale.set(shape.aspect * 1.7 * pose.scaleX, 1.0, 1);
    shadowMaterial.opacity = 0.2 * pose.opacity * (1 - pose.ghost);

    // accents
    accents.position.set(pose.offsetX, pose.offsetY, 0);
    const t = pose.time;
    arcMaterial.opacity = pose.arcs * 0.65 * pose.opacity;
    arcs.forEach((arc, i) => {
      const wob = 1 + Math.sin(t * 4.2 + i) * 0.03 + pose.level * 0.12;
      arc.scale.set(shape.aspect * 0.98 * wob, wob, 1);
      arc.visible = pose.arcs > 0.01;
    });

    sparkles.forEach((sprite, i) => {
      const ang = (i / SPARKLE_COUNT) * Math.PI * 2 + t * 0.55;
      const r = shape.aspect + 0.5 + Math.sin(t * 1.3 + i) * 0.08;
      sprite.position.set(
        Math.cos(ang) * r,
        Math.sin(ang * 1.3 + i) * 0.85 + 0.15,
        Math.sin(ang) * 0.35
      );
      const twinkle = 0.45 + 0.55 * Math.max(0, Math.sin(t * 3.1 + i * 1.7));
      sparkleMaterials[i].opacity =
        pose.sparkle * (0.5 + twinkle * 0.5) * pose.opacity;
      sprite.scale.setScalar(0.14 + twinkle * 0.16);
      sprite.material.rotation = t * 0.8 + i;
      sprite.visible = pose.sparkle > 0.01;
    });

    rayMaterial.opacity = pose.rays * 0.7 * pose.opacity;
    rays.visible = pose.rays > 0.01;
    if (rays.visible) {
      const grow = 1 + (1 - pose.rays) * 0.3 + Math.sin(t * 6) * 0.02;
      for (let i = 0; i < RAY_COUNT; i += 1) {
        const ang = THREE.MathUtils.degToRad(50 + (80 / (RAY_COUNT - 1)) * i);
        const cx = Math.cos(ang) * shape.aspect;
        const cy = Math.sin(ang);
        const r0 = 1.08 * grow;
        const r1 = r0 + 0.2 + (i % 2) * 0.07;
        rayPositions.set([cx * r0, cy * r0, 0.6, cx * r1, cy * r1, 0.6], i * 6);
      }
      rayGeometry.attributes.position.needsUpdate = true;
    }

    trail.forEach((mesh, i) => {
      const lag = (i + 1) * 0.55;
      mesh.position.set(
        -(shape.aspect + 0.25) - lag * pose.trail,
        0.1 - i * 0.12 + Math.sin(t * 2 + i) * 0.04,
        0.2
      );
      trailMaterials[i].opacity = pose.trail * (0.32 - i * 0.08);
      mesh.visible = pose.trail > 0.01;
    });

    renderer.render(scene, camera);
  };

  const resize = () => {
    const parent = canvas.parentElement;
    const width = parent?.clientWidth || canvas.clientWidth || 1;
    const height = parent?.clientHeight || canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // keep the body framed regardless of aspect ratio
    const fit = Math.min(1, camera.aspect / 1.1);
    camera.position.z = CAMERA_DISTANCE / fit;
    camera.lookAt(0, -0.12, 0);
  };

  const loop = createLoop(step);
  resize();
  step(0);
  if (options.autoStart !== false) loop.start();

  return {
    kind: '3d',
    engine,
    element: canvas,
    setState: (state: MurmulloState) => engine.setState(state),
    pushLevel: (level: number) => engine.pushLevel(level),
    setParams: (patch: MurmulloParamsPatch) => {
      engine.setParams(patch);
      applyParams();
    },
    resize,
    setRunning: (running: boolean) => (running ? loop.start() : loop.stop()),
    dispose: () => {
      loop.stop();
      bodyGeometry.dispose();
      bodyMaterial.dispose();
      openGeometry.dispose();
      smileGeometry.dispose();
      arcGeometry.dispose();
      rayGeometry.dispose();
      trail.forEach(mesh => mesh.geometry.dispose());
      [
        eyeMaterial,
        eyeGlowMaterial,
        auraMaterial,
        shadowMaterial,
        arcMaterial,
        rayMaterial,
      ].forEach(m => m.dispose());
      sparkleMaterials.forEach(m => m.dispose());
      trailMaterials.forEach(m => m.dispose());
      glowTexture.dispose();
      starTexture.dispose();
      auraTexture.dispose();
      renderer.dispose();
    },
  };
}
