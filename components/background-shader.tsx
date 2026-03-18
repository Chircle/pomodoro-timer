"use client"

import { useEffect, useRef } from "react"

type Phase = "idle" | "focus" | "break" | "done"

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform vec3  u_color1;
uniform vec3  u_color2;
uniform vec3  u_color3;
uniform vec3  u_color4;

/* Stripe-free hash: integer-style bit mixing, no sin() */
vec2 hash2(vec2 p) {
  vec2 q = vec2(dot(p, vec2(127.1, 311.7)),
               dot(p, vec2(269.5, 183.3)));
  /* two rounds of mixing to break up regularity */
  q = fract(q * vec2(0.1031, 0.1030));
  q += dot(q, q.yx + 19.19);
  return fract((q.xx + q.yx) * q.xy) * 2.0 - 1.0;
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(hash2(i + vec2(0.0,0.0)), f - vec2(0.0,0.0)),
        dot(hash2(i + vec2(1.0,0.0)), f - vec2(1.0,0.0)), u.x),
    mix(dot(hash2(i + vec2(0.0,1.0)), f - vec2(0.0,1.0)),
        dot(hash2(i + vec2(1.0,1.0)), f - vec2(1.0,1.0)), u.x), u.y);
}

/* 4-octave FBM with rotation */
float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v   += amp * noise(p);
    p    = rot * p * 2.0 + vec2(3.7, 1.4);
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv    = gl_FragCoord.xy / u_resolution;
  uv.y       = 1.0 - uv.y;
  vec2 mouse = u_mouse / u_resolution;
  /* mouse is already in CSS coords (Y=0 top), same as flipped uv — no extra flip needed */

  float t = u_time * 0.07;

  /* ── Domain warp (two FBM passes → very organic wobble) ── */
  vec2 q = vec2(fbm(uv * 2.0 + vec2(0.0, 0.0) + t * 0.3),
                fbm(uv * 2.0 + vec2(5.2, 1.3) + t * 0.25));
  vec2 r = vec2(fbm(uv * 1.8 + 3.5 * q + vec2(1.7, 9.2) + t * 0.5),
                fbm(uv * 1.8 + 3.5 * q + vec2(8.3, 2.8) + t * 0.4));
  vec2 wuv = uv + r * 0.18;

  /* ── 4 colour centres orbiting at different speeds ── */
  vec2 p1 = vec2(0.5 + 0.40 * cos(t * 0.70 + 0.00),  0.5 + 0.38 * sin(t * 0.55 + 0.00));
  vec2 p2 = vec2(0.5 + 0.38 * cos(t * 0.53 + 2.09),  0.5 + 0.42 * sin(t * 0.67 + 1.10));
  vec2 p3 = vec2(0.5 + 0.42 * cos(t * 0.61 + 4.19),  0.5 + 0.36 * sin(t * 0.46 + 2.30));
  vec2 p4 = vec2(0.5 + 0.36 * cos(t * 0.42 + 1.57),  0.5 + 0.40 * sin(t * 0.74 + 3.80));

  /* Inverse-distance weighting → all 4 colours always visible */
  float eps = 0.04;
  float d1 = length(wuv - p1) + eps;
  float d2 = length(wuv - p2) + eps;
  float d3 = length(wuv - p3) + eps;
  float d4 = length(wuv - p4) + eps;
  float w1 = 1.0 / (d1 * d1);
  float w2 = 1.0 / (d2 * d2);
  float w3 = 1.0 / (d3 * d3);
  float w4 = 1.0 / (d4 * d4);
  float wt = w1 + w2 + w3 + w4;
  vec3 col = (u_color1 * w1 + u_color2 * w2 + u_color3 * w3 + u_color4 * w4) / wt;

  /* ── Mouse spotlight: soft pastel glow that drifts with cursor ── */
  float mbDist = length(uv - mouse);

  /* Mix neighboring colours toward the brightest pastel near the cursor,
     using a wide very-soft gaussian-like falloff — no harsh edges ever */
  float spotInner = exp(-mbDist * mbDist * 28.0);   /* tight centre */
  float spotOuter = exp(-mbDist * mbDist *  6.0);   /* wide dreamy halo */

  /* Pull the local colour toward a lighter, slightly-shifted version of itself */
  vec3 lightened = mix(col, vec3(1.0), 0.55);
  col = mix(col, lightened, spotOuter * 0.45);
  col = mix(col, vec3(1.0), spotInner * 0.30);

  /* ── Pastel lift: push everything toward white for softness ── */
  col = mix(col, vec3(1.0), 0.28);

  gl_FragColor = vec4(col, 1.0);
}
`

/* Per-phase pastel palettes (RGB 0-1) */
const PALETTES: Record<Phase, [[number,number,number],[number,number,number],[number,number,number],[number,number,number]]> = {
  idle: [
    [1.00, 0.75, 0.85],  // rose
    [0.80, 0.72, 0.95],  // lavender
    [0.72, 0.95, 0.85],  // mint
    [0.72, 0.88, 1.00],  // sky
  ],
  focus: [
    [1.00, 0.72, 0.82],  // blush pink
    [0.95, 0.68, 0.88],  // soft magenta
    [0.85, 0.72, 0.98],  // lilac
    [1.00, 0.85, 0.72],  // peach
  ],
  break: [
    [0.72, 0.95, 0.88],  // mint
    [0.72, 0.88, 1.00],  // sky blue
    [0.78, 0.98, 0.95],  // aqua
    [0.88, 0.78, 0.98],  // soft purple
  ],
  done: [
    [1.00, 0.75, 0.85],
    [0.80, 0.72, 0.95],
    [0.72, 0.95, 0.85],
    [0.72, 0.88, 1.00],
  ],
}

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  return sh
}

export function BackgroundShader({ phase }: { phase: Phase }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phaseRef  = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext("webgl")
    if (!gl) return

    const prog = gl.createProgram()!
    gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER,   VERT))
    gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    /* Full-screen quad */
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(prog, "a_position")
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uTime  = gl.getUniformLocation(prog, "u_time")
    const uRes   = gl.getUniformLocation(prog, "u_resolution")
    const uMouse = gl.getUniformLocation(prog, "u_mouse")
    const uC     = [
      gl.getUniformLocation(prog, "u_color1"),
      gl.getUniformLocation(prog, "u_color2"),
      gl.getUniformLocation(prog, "u_color3"),
      gl.getUniformLocation(prog, "u_color4"),
    ]

    /* Smooth mouse position */
    let targetX = window.innerWidth  / 2
    let targetY = window.innerHeight / 2
    let smoothX = targetX
    let smoothY = targetY

    const onMove = (e: MouseEvent) => { targetX = e.clientX; targetY = e.clientY }
    window.addEventListener("mousemove", onMove)

    /* Resize */
    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener("resize", resize)

    /* Interpolated colours so phase transitions are silky */
    const cur: number[][] = PALETTES[phaseRef.current].map(c => [...c])

    let raf: number
    const t0 = performance.now()

    const render = () => {
      const t = (performance.now() - t0) / 1000
      smoothX += (targetX - smoothX) * 0.075
      smoothY += (targetY - smoothY) * 0.075

      const pal = PALETTES[phaseRef.current]
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 3; j++)
          cur[i][j] += (pal[i][j] - cur[i][j]) * 0.012

      gl.uniform1f(uTime,  t)
      gl.uniform2f(uRes,   canvas.width, canvas.height)
      gl.uniform2f(uMouse, smoothX, smoothY)
      uC.forEach((loc, i) => gl.uniform3fv(loc, cur[i]))

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      raf = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("resize",    resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0, display: "block" }}
    />
  )
}
