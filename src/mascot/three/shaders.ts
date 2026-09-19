/**
 * GLSL for the Murmullo body.
 *
 * Vertex: unit icosphere → ellipsoid (aspect/depth) → static asymmetric lobes
 * (seeded noise) → flowing noise → audio ring. Normals are rebuilt by
 * displacing two tangent neighbours so lighting stays smooth.
 *
 * Fragment: obsidian core, fake subsurface, fresnel rim, thin-film
 * iridescence, top-left specular, translucency towards the edges.
 */

export const SIMPLEX_3D = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

export const BODY_VERTEX = /* glsl */ `
uniform float uPhase;
uniform float uFlowAmp;
uniform float uLevel;
uniform float uPulse;
uniform float uAsymmetry;
uniform float uLobeFreq;
uniform float uSeed;
uniform vec3 uAxes; // aspect, 1, depth

varying vec3 vNormalV;
varying vec3 vViewPos;
varying vec3 vObjPos;
varying float vDisp;

${SIMPLEX_3D}

// displacement (along the unit normal) for a point on the unit sphere
float displaceAmount(vec3 n) {
  vec3 seeded = n * uLobeFreq + vec3(uSeed * 0.731, uSeed * 0.173, uSeed * 0.417);
  float lobes = snoise(seeded) * uAsymmetry;
  // bottom is flatter and heavier, top is rounder (cloud silhouette)
  float bottom = clamp((-n.y - 0.2) / 0.8, 0.0, 1.0);
  lobes -= bottom * bottom * 0.08 * uAsymmetry * 4.0;
  float flow = snoise(n * 1.45 + vec3(0.0, uPhase * 0.55, uPhase * 0.35)) * 0.11;
  flow += snoise(n * 3.0 - vec3(uPhase * 0.4, 0.0, uPhase * 0.6)) * 0.014;
  flow *= uFlowAmp;
  float ring = sin(n.y * 4.0 - uPhase * 6.0) * uLevel * 0.05;
  float pop = uPulse * 0.04;
  return lobes + flow + ring + pop;
}

vec3 displaced(vec3 n) {
  vec3 p = n * uAxes;
  return p + n * displaceAmount(n);
}

void main() {
  vec3 n = normalize(position);
  vec3 p = displaced(n);

  // rebuild normal from two displaced neighbours
  vec3 t = normalize(abs(n.y) < 0.99 ? cross(n, vec3(0.0, 1.0, 0.0)) : vec3(1.0, 0.0, 0.0));
  vec3 b = normalize(cross(n, t));
  float e = 0.02;
  vec3 pt = displaced(normalize(n + t * e));
  vec3 pb = displaced(normalize(n + b * e));
  vec3 newNormal = normalize(cross(pt - p, pb - p));
  if (dot(newNormal, n) < 0.0) newNormal = -newNormal;

  vObjPos = p;
  vDisp = displaceAmount(n);
  vNormalV = normalize(normalMatrix * newNormal);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

export const BODY_FRAGMENT = /* glsl */ `
precision highp float;

uniform vec3 uCore;
uniform vec3 uDeep;
uniform vec3 uRim;
uniform vec3 uGlowA;
uniform vec3 uGlowB;
uniform vec3 uGhostColor;
uniform float uTranslucency;
uniform float uIridescence;
uniform float uRimStrength;
uniform float uGloss;
uniform float uGlow;
uniform float uOpacity;
uniform float uGhost;
uniform float uHue;
uniform float uTime;

varying vec3 vNormalV;
varying vec3 vViewPos;
varying vec3 vObjPos;
varying float vDisp;

void main() {
  vec3 N = normalize(vNormalV);
  vec3 V = normalize(-vViewPos);
  float ndv = max(dot(N, V), 0.0);
  float fres = pow(1.0 - ndv, 2.4);

  // key light top-left, fill from below-right for the subsurface look
  vec3 L = normalize(vec3(-0.55, 0.85, 0.6));
  vec3 F = normalize(vec3(0.6, -0.5, 0.4));
  float ndl = dot(N, L) * 0.5 + 0.5;
  float ndf = max(dot(N, F), 0.0);

  vec3 rimCol = mix(uRim, uGlowA, clamp(-uHue, 0.0, 1.0));
  rimCol = mix(rimCol, uGhostColor, clamp(uHue, 0.0, 1.0));

  // body: obsidian core lit from the top-left, smoky "deep" tone where light
  // passes through (thin edges, top of the body)
  vec3 base = mix(uCore, uDeep, clamp(vDisp * 1.8 + 0.35, 0.0, 1.0) * 0.5);
  float through = smoothstep(0.15, 1.0, fres) * uTranslucency;
  base = mix(base, uDeep, ndl * 0.55 * uTranslucency + through * 0.5);
  base = mix(base, rimCol, through * 0.35);
  base += rimCol * ndf * 0.12 * uTranslucency;

  float band = sin(fres * 7.0 + vObjPos.y * 2.5 - vObjPos.x * 1.5 + uTime * 0.25) * 0.5 + 0.5;
  vec3 irid = mix(uGlowA, uGlowB, band);

  vec3 col = base;
  col += rimCol * fres * uRimStrength * (0.6 + uGlow * 0.9);
  col += irid * pow(fres, 1.6) * uIridescence * 0.8;
  col += rimCol * pow(fres, 4.0) * uGlow * 0.6;
  // broad soft sheen (subsurface glow) toward the light
  col += mix(rimCol, vec3(1.0), 0.5) * pow(ndl, 3.0) * 0.16 * uTranslucency;

  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), mix(120.0, 40.0, uGloss)) * (0.15 + uGloss * 0.35);
  col += vec3(spec) * (0.7 + 0.3 * uGlow);

  // ghostly tint when fading to the background
  col = mix(col, mix(uGhostColor, vec3(1.0), 0.25), uGhost * 0.4);

  float alpha = uOpacity * (1.0 - fres * uTranslucency * 0.6);
  alpha = mix(alpha, alpha * 0.75, uGhost);
  gl_FragColor = vec4(col, alpha);
}
`;
