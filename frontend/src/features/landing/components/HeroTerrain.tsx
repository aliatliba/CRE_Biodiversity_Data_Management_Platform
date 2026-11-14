import { useEffect, useRef, useState } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  LineSegments,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three'
import { ContourField } from './ContourField'
import { createLeaves } from './heroLeaves'

/**
 * Hero background: a point-cloud relief (Atlas ridges behind, softer dunes in
 * front) with topographic contour bands, a few glowing survey beacons, and
 * leaves drifting down in front of it (heroLeaves.ts).
 * Purely decorative — positions are not real site coordinates.
 *
 * Loaded lazily so three.js only ships with the landing page. The height field
 * runs in the vertex shader, so the CPU only advances a time uniform.
 */

// Ashima Arts 2D simplex noise (MIT) + the terrain height function.
// Shared by every shader so beacons sit exactly on the surface.
const TERRAIN_GLSL = /* glsl */ `
  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // p = (x, z). Ridged peaks towards the back, gentle swells near the camera.
  float terrain(vec2 p, float t) {
    vec2 q = p * 0.085 + vec2(t * 0.012, t * 0.035);
    float n = snoise(q) * 0.6 + snoise(q * 2.1 + 3.7) * 0.28 + snoise(q * 4.3 - 1.3) * 0.12;
    float ridge = 1.0 - abs(n);
    float back = smoothstep(6.0, -22.0, p.y);
    return mix(n * 1.3, ridge * ridge * 5.2 - 0.8, back);
  }
`

const SURFACE_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  varying float vHeight;
  varying float vFade;
  ${TERRAIN_GLSL}
  void main() {
    vec3 p = position;
    p.y += terrain(p.xz, uTime);
    vHeight = p.y;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (34.0 / -mv.z);
    vFade = smoothstep(32.0, 20.0, abs(p.x)) * smoothstep(-40.0, -16.0, p.z) * smoothstep(13.0, 5.0, p.z);
  }
`

const SURFACE_FRAGMENT = /* glsl */ `
  uniform vec3 uLow;
  uniform vec3 uHigh;
  varying float vHeight;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float disc = smoothstep(0.5, 0.05, d);
    float t = clamp((vHeight + 1.2) / 4.6, 0.0, 1.0);
    // Topographic contour bands every ~0.7 units of height.
    float f = fract(vHeight * 1.4);
    float band = 1.0 - smoothstep(0.0, 0.09, min(f, 1.0 - f));
    vec3 color = mix(uLow, uHigh, t) + band * 0.25;
    gl_FragColor = vec4(color, disc * vFade * (0.45 + 0.55 * band) * (0.6 + 0.4 * t));
  }
`

const BEACON_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  attribute float aLift;
  attribute float aPhase;
  varying float vLift;
  varying float vPulse;
  ${TERRAIN_GLSL}
  void main() {
    vec3 p = position;
    p.y += terrain(p.xz, uTime) + aLift;
    vLift = aLift;
    vPulse = 0.5 + 0.5 * sin(uTime * 2.2 + aPhase);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (1.0 + 0.45 * vPulse) * (34.0 / -mv.z);
  }
`

const BEACON_POINT_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vPulse;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.22, 0.0, d);
    float halo = smoothstep(0.5, 0.0, d) * (0.35 + 0.4 * vPulse);
    gl_FragColor = vec4(uColor, core + halo);
  }
`

const BEACON_HEIGHT = 1.6

const BEACON_LINE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vLift;
  void main() {
    gl_FragColor = vec4(uColor, 0.15 + 0.5 * (vLift / ${BEACON_HEIGHT.toFixed(1)}));
  }
`
const BEACONS: [number, number][] = [
  [-9, -7], [-2.5, -13], [4.5, -8.5], [11, -16], [7.5, -3], [-13, -18], [1, -22], [16, -9],
]

function buildSurface(cols: number, rows: number) {
  const positions = new Float32Array(cols * rows * 3)
  let i = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions[i++] = -32 + (64 * c) / (cols - 1)
      positions[i++] = 0
      positions[i++] = -40 + (53 * r) / (rows - 1)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  return geometry
}

function buildBeacons(withStems: boolean) {
  const count = withStems ? BEACONS.length * 2 : BEACONS.length
  const positions = new Float32Array(count * 3)
  const lift = new Float32Array(count)
  const phase = new Float32Array(count)
  BEACONS.forEach(([x, z], b) => {
    const ends = withStems ? [0, BEACON_HEIGHT] : [BEACON_HEIGHT]
    ends.forEach((h, e) => {
      const v = withStems ? b * 2 + e : b
      positions.set([x, 0, z], v * 3)
      lift[v] = h
      phase[v] = b * 1.7
    })
  })
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aLift', new BufferAttribute(lift, 1))
  geometry.setAttribute('aPhase', new BufferAttribute(phase, 1))
  return geometry
}

export default function HeroTerrain() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      setStatus('failed')
      return
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isSmall = container.clientWidth < 640
    const pixelRatio = Math.min(window.devicePixelRatio, 1.5)

    renderer.setPixelRatio(pixelRatio)
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.setAttribute('aria-hidden', 'true')
    renderer.domElement.className = 'block h-full w-full'
    container.appendChild(renderer.domElement)

    const scene = new Scene()
    const camera = new PerspectiveCamera(50, 1, 0.1, 100)
    const lookAt = { x: 0, y: 0.6, z: -8 }

    const uniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
    }
    const blend = { transparent: true, depthWrite: false, blending: AdditiveBlending }

    const surfaceGeometry = buildSurface(isSmall ? 90 : 170, isSmall ? 70 : 130)
    const surfaceMaterial = new ShaderMaterial({
      ...blend,
      uniforms: {
        ...uniforms,
        uSize: { value: isSmall ? 2.4 : 2.0 },
        uLow: { value: new Color('#139a43') },
        uHigh: { value: new Color('#9ef01a') },
      },
      vertexShader: SURFACE_VERTEX,
      fragmentShader: SURFACE_FRAGMENT,
    })
    scene.add(new Points(surfaceGeometry, surfaceMaterial))

    const beaconColor = { value: new Color('#c3f56b') }
    const stemGeometry = buildBeacons(true)
    const stemMaterial = new ShaderMaterial({
      ...blend,
      uniforms: { ...uniforms, uSize: { value: 0 }, uColor: beaconColor },
      vertexShader: BEACON_VERTEX,
      fragmentShader: BEACON_LINE_FRAGMENT,
    })
    scene.add(new LineSegments(stemGeometry, stemMaterial))

    const headGeometry = buildBeacons(false)
    const headMaterial = new ShaderMaterial({
      ...blend,
      uniforms: { ...uniforms, uSize: { value: 7 }, uColor: beaconColor },
      vertexShader: BEACON_VERTEX,
      fragmentShader: BEACON_POINT_FRAGMENT,
    })
    scene.add(new Points(headGeometry, headMaterial))

    const leaves = createLeaves(isSmall ? 14 : 28, isSmall ? 5 : 12)
    scene.add(leaves.mesh)

    // Pointer drifts the camera a little; eased every frame.
    const pointer = { x: 0, y: 0 }
    const eased = { x: 0, y: 0 }
    function onPointerMove(event: PointerEvent) {
      pointer.x = event.clientX / window.innerWidth - 0.5
      pointer.y = event.clientY / window.innerHeight - 0.5
    }

    function placeCamera() {
      camera.position.set(eased.x * 3, 5.2 - eased.y * 1.2, 14)
      camera.lookAt(lookAt.x, lookAt.y, lookAt.z)
    }

    function resize() {
      const { clientWidth: w, clientHeight: h } = container!
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      // Keep the relief filling narrow (portrait) screens.
      camera.fov = w / h < 1 ? 70 : 50
      camera.updateProjectionMatrix()
      renderer.render(scene, camera)
    }

    let frame = 0
    let last = performance.now()
    let running = false

    function tick(now: number) {
      uniforms.uTime.value += Math.min((now - last) / 1000, 0.05)
      last = now
      eased.x += (pointer.x - eased.x) * 0.04
      eased.y += (pointer.y - eased.y) * 0.04
      leaves.uniforms.uTime.value = uniforms.uTime.value
      // The pointer acts as a light wind on the leaves.
      leaves.uniforms.uWind.value = eased.x
      placeCamera()
      renderer.render(scene, camera)
      frame = requestAnimationFrame(tick)
    }

    function start() {
      if (running || reduceMotion) return
      running = true
      last = performance.now()
      frame = requestAnimationFrame(tick)
    }

    function stop() {
      running = false
      cancelAnimationFrame(frame)
    }

    if (reduceMotion) leaves.uniforms.uTime.value = 6
    placeCamera()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    resize()
    setStatus('ready')

    // Only animate while the hero is on screen and the tab is visible.
    let inView = true
    const intersection = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      if (inView && !document.hidden) start()
      else stop()
    })
    intersection.observe(container)

    function onVisibility() {
      if (document.hidden) stop()
      else if (inView) start()
    }
    document.addEventListener('visibilitychange', onVisibility)
    if (!reduceMotion) window.addEventListener('pointermove', onPointerMove, { passive: true })
    start()

    return () => {
      stop()
      resizeObserver.disconnect()
      intersection.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointermove', onPointerMove)
      surfaceGeometry.dispose()
      surfaceMaterial.dispose()
      stemGeometry.dispose()
      stemMaterial.dispose()
      headGeometry.dispose()
      headMaterial.dispose()
      leaves.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {status !== 'ready' && (
        <div className="absolute inset-0 opacity-30">
          <ContourField tone="dark" />
        </div>
      )}
      <div
        ref={containerRef}
        className={`absolute inset-0 transition-opacity duration-1000 ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}
