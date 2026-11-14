import {
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
} from 'three'

/**
 * Leaves drifting down through the hero, in 3D: each one falls, sways and
 * tumbles, folded along its midrib so it catches the light as it turns.
 *
 * One instanced mesh (a single draw call) and all motion in the vertex shader:
 * the CPU only advances the shared time uniform, whatever the leaf count.
 */

const LEAF_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uWind;
  attribute vec3 aStart;    // x, phase (0-1), z
  attribute vec4 aMotion;   // fall speed, sway amplitude, sway frequency, spin speed
  attribute vec4 aLook;     // scale, fold, hue mix, seed
  attribute vec3 aAxis;     // tumble axis
  varying vec2 vLocal;
  varying vec3 vNormal;
  varying float vHue;
  varying float vFade;

  const float TOP = 9.5;
  const float HEIGHT = 11.0;

  mat3 rotation(vec3 axis, float angle) {
    float s = sin(angle), c = cos(angle), oc = 1.0 - c;
    return mat3(
      oc * axis.x * axis.x + c,          oc * axis.x * axis.y + axis.z * s, oc * axis.z * axis.x - axis.y * s,
      oc * axis.x * axis.y - axis.z * s, oc * axis.y * axis.y + c,          oc * axis.y * axis.z + axis.x * s,
      oc * axis.z * axis.x + axis.y * s, oc * axis.y * axis.z - axis.x * s, oc * axis.z * axis.z + c
    );
  }

  void main() {
    float seed = aLook.w;
    float fold = aLook.y;

    // Leaf in its own frame: V-fold along the midrib, slight curl at the tip.
    vec3 p = position;
    p.z = abs(p.x) * fold + p.y * p.y * 0.35;
    vec3 n = normalize(vec3(-sign(p.x) * fold, -p.y * 0.7, 1.0));

    // Tumble around a per-leaf axis, plus the rocking of a falling leaf.
    float t = uTime;
    mat3 r = rotation(aAxis, t * aMotion.w + seed * 6.283)
           * rotation(vec3(1.0, 0.0, 0.0), sin(t * aMotion.z * 1.3 + seed * 9.0) * 0.7);
    p = r * (p * aLook.x);
    vNormal = normalize(r * n);

    // Fall through the volume and wrap; fade in at the top and out at the bottom.
    float f = fract(aStart.y + t * aMotion.x / HEIGHT);
    vec3 world = vec3(
      aStart.x + sin(t * aMotion.z + seed * 12.0) * aMotion.y + uWind * (1.0 - f) * 2.2 - f * 2.5,
      TOP - f * HEIGHT,
      aStart.z + cos(t * aMotion.z * 0.8 + seed * 7.0) * aMotion.y * 0.6
    );
    vFade = smoothstep(0.0, 0.1, f) * smoothstep(1.0, 0.85, f);

    vLocal = position.xy;
    vHue = aLook.z;
    gl_Position = projectionMatrix * viewMatrix * vec4(world + p, 1.0);
  }
`

const LEAF_FRAGMENT = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uFresh;
  uniform vec3 uLight;
  varying vec2 vLocal;
  varying vec3 vNormal;
  varying float vHue;
  varying float vFade;

  void main() {
    vec3 n = normalize(gl_FrontFacing ? vNormal : -vNormal);
    vec3 light = normalize(uLight);
    float diffuse = max(dot(n, light), 0.0);
    // Light passing through the leaf from behind glows lime.
    float through = pow(max(dot(-n, light), 0.0), 2.0);

    vec3 base = mix(uDeep, uFresh, vHue);
    // Midrib and side veins, a little lighter than the blade.
    float rib = 1.0 - smoothstep(0.0, 0.018, abs(vLocal.x));
    float veins = 1.0 - smoothstep(0.0, 0.05, abs(fract((vLocal.y - abs(vLocal.x) * 1.4) * 7.0) - 0.5));
    base += (rib * 0.35 + veins * 0.06) * uFresh;

    vec3 color = base * (0.55 + 0.7 * diffuse) + uFresh * through * 0.5;
    gl_FragColor = vec4(color, vFade);
  }
`

/** Leaf outline: pointed tip, rounded base, ~1 unit long. */
function leafGeometry() {
  const s = new Shape()
  s.moveTo(0, -0.5)
  s.bezierCurveTo(0.28, -0.4, 0.36, -0.05, 0.27, 0.18)
  s.bezierCurveTo(0.19, 0.37, 0.07, 0.46, 0, 0.5)
  s.bezierCurveTo(-0.07, 0.46, -0.19, 0.37, -0.27, 0.18)
  s.bezierCurveTo(-0.36, -0.05, -0.28, -0.4, 0, -0.5)
  return new ShapeGeometry(s, 6)
}

// Deterministic pseudo-random numbers: the same leaves on every load.
function random(seed: number) {
  let state = seed
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

/** `spread`: half-width of the band the leaves fall through (narrower on phones). */
export function createLeaves(count: number, spread = 12) {
  const geometry = leafGeometry()
  const rand = random(7)
  const start = new Float32Array(count * 3)
  const motion = new Float32Array(count * 4)
  const look = new Float32Array(count * 4)
  const axis = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    // Spread across the width, more of them on the right where the relief is open.
    const x = spread * (-0.85 + Math.pow(rand(), 0.75) * 2)
    const z = -7 + rand() * 15
    start.set([x, i / count + rand() * 0.04, z], i * 3)
    motion.set([0.55 + rand() * 0.5, 0.5 + rand() * 0.9, 0.5 + rand() * 0.6, 0.35 + rand() * 0.6], i * 4)
    // Nearer leaves a little smaller, so none fills the screen.
    const scale = (0.8 + rand() * 0.6) * (z > 4 ? 0.8 : 1)
    look.set([scale, 0.18 + rand() * 0.22, rand(), rand()], i * 4)
    const ax = rand() - 0.5
    const ay = rand() - 0.5
    const az = rand() - 0.5
    const len = Math.hypot(ax, ay, az) || 1
    axis.set([ax / len, ay / len, az / len], i * 3)
  }

  geometry.setAttribute('aStart', new InstancedBufferAttribute(start, 3))
  geometry.setAttribute('aMotion', new InstancedBufferAttribute(motion, 4))
  geometry.setAttribute('aLook', new InstancedBufferAttribute(look, 4))
  geometry.setAttribute('aAxis', new InstancedBufferAttribute(axis, 3))

  const uniforms = {
    uTime: { value: 0 },
    uWind: { value: 0 },
    uDeep: { value: new Color('#139a43') },
    uFresh: { value: new Color('#9ef01a') },
    uLight: { value: [0.4, 0.8, 0.6] },
  }
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: LEAF_VERTEX,
    fragmentShader: LEAF_FRAGMENT,
    side: DoubleSide,
    transparent: true,
  })

  const mesh = new InstancedMesh(geometry, material, count)
  // Positions come from the shader: identity matrices, and never cull the batch.
  const identity = new Matrix4()
  for (let i = 0; i < count; i++) mesh.setMatrixAt(i, identity)
  mesh.frustumCulled = false
  mesh.renderOrder = 1

  return {
    mesh,
    uniforms,
    dispose() {
      geometry.dispose()
      material.dispose()
    },
  }
}
