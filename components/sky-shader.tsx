"use client"

import { useEffect, useRef } from "react"

// dayProgress: 0.0 = midnight, 0.5 = noon, 1.0 = midnight again
// We drive it from outside so the timer controls the "day"

const VERT = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`

const FRAG = `
precision highp float;

uniform float u_time;
uniform float u_day;
uniform vec2  u_resolution;
uniform vec2  u_mouse;

/* ── stripe-free hash ── */
float hash2(vec2 p) {
  vec2 q = fract(p * vec2(0.1031, 0.1030));
  q += dot(q, q.yx + 19.19);
  return fract((q.x + q.y) * q.x);
}

float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash2(i),           hash2(i+vec2(1,0)), u.x),
             mix(hash2(i+vec2(0,1)), hash2(i+vec2(1,1)), u.x), u.y);
}

float fbm(vec2 p) {
  float v=0.0, a=0.52;
  mat2 rot = mat2(0.8,-0.6,0.6,0.8);
  for(int i=0;i<5;i++){ v+=a*noise(p); p=rot*p*2.1+vec2(1.7,9.2); a*=0.48; }
  return v;
}

/* smooth step through a colour keyframe list (GLSL 1.0 safe) */
vec3 lerpKey(float t,
    vec3 c0,vec3 c1,vec3 c2,vec3 c3,vec3 c4,
    vec3 c5,vec3 c6,vec3 c7,vec3 c8) {
  float s = clamp(t, 0.0, 1.0) * 8.0;
  int   i = int(s);
  float f = smoothstep(0.0, 1.0, fract(s));
  vec3 a = c0;
  if(i>=1) a=c1; if(i>=2) a=c2; if(i>=3) a=c3;
  if(i>=4) a=c4; if(i>=5) a=c5; if(i>=6) a=c6; if(i>=7) a=c7;
  vec3 b = c1;
  if(i>=1) b=c2; if(i>=2) b=c3; if(i>=3) b=c4;
  if(i>=4) b=c5; if(i>=5) b=c6; if(i>=6) b=c7; if(i>=7) b=c8;
  return mix(a, b, f);
}

/* day keys: midnight, predawn, sunrise, morning, noon, afternoon, sunset, dusk, midnight */
vec3 skyTop(float d) {
  return lerpKey(d,
    vec3(0.02,0.02,0.10),  /* midnight navy */
    vec3(0.08,0.06,0.22),  /* predawn indigo */
    vec3(0.72,0.38,0.55),  /* sunrise pink */
    vec3(0.32,0.60,0.95),  /* morning blue */
    vec3(0.18,0.48,0.92),  /* noon deep blue */
    vec3(0.30,0.58,0.95),  /* afternoon */
    vec3(0.65,0.28,0.42),  /* sunset rose */
    vec3(0.18,0.08,0.32),  /* dusk purple */
    vec3(0.02,0.02,0.10)); /* midnight */
}
vec3 skyBot(float d) {
  return lerpKey(d,
    vec3(0.04,0.04,0.16),
    vec3(0.15,0.10,0.30),
    vec3(1.00,0.70,0.35),  /* sunrise orange horizon */
    vec3(0.65,0.85,1.00),
    vec3(0.58,0.80,1.00),
    vec3(0.68,0.85,1.00),
    vec3(1.00,0.55,0.22),  /* sunset orange */
    vec3(0.35,0.14,0.42),
    vec3(0.04,0.04,0.16));
}

/* sun arc: left at d=0.25, top at d=0.5, right at d=0.75. below horizon at night */
vec2 sunPos(float d) {
  float angle = (d - 0.25) * 3.14159;
  float x = 0.5 + 0.46 * cos(3.14159 - angle);
  float y = 0.85 - 0.70 * sin(angle);
  return vec2(x, y);
}
float sunBrightness(float d) {
  return smoothstep(0.20, 0.30, d) * smoothstep(0.80, 0.70, d);
}

/* ── stars: ~10 sparse ones, twinkle by size ── */
vec3 drawStars(vec2 uv, float nightAmt) {
  if(nightAmt < 0.01) return vec3(0.0);
  vec3 stars = vec3(0.0);

  /* coarse grid → very few cells → very few stars */
  float scale  = 8.0;   /* 8x8 = 64 cells, ~10% occupied = ~6-8 stars */
  vec2  grid   = floor(uv * scale);
  vec2  cell   = fract(uv * scale);
  float rnd    = hash2(grid);

  if(rnd > 0.10) return vec3(0.0);   /* only ~10% of cells get a star */

  /* position within cell (avoid edges) */
  float rx = hash2(grid + 0.1) * 0.6 + 0.2;
  float ry = hash2(grid + 0.3) * 0.6 + 0.2;
  vec2  sp = vec2(rx, ry);
  float d  = length(cell - sp);

  /* twinkle: radius pulses slowly */
  float speed   = 0.6 + rnd * 1.2;
  float phase   = rnd * 6.28;
  float twinkle = 0.50 + 0.50 * sin(u_time * speed + phase);  /* 0..1 */
  float radius  = mix(0.008, 0.022, twinkle);                 /* size change */

  float core = exp(-d * d / (radius * radius * 0.5));
  float glow = exp(-d * d / (radius * radius * 8.0)) * 0.3;

  vec3 col = mix(vec3(0.85, 0.92, 1.00), vec3(1.00, 0.95, 0.80), rnd);
  stars = col * (core + glow) * nightAmt;
  return stars;
}

/* ── clouds ── */
float cloudLayer(vec2 uv, float speed, float seed) {
  float cx = fract(uv.x + u_time * speed + seed);
  vec2  cp = vec2(cx * 3.2, uv.y * 1.6 + seed * 2.1);
  return smoothstep(0.50, 0.68, fbm(cp));
}

void main() {
  vec2 uv    = gl_FragCoord.xy / u_resolution;
  uv.y       = 1.0 - uv.y;          /* Y=0 top */
  vec2 mouse = u_mouse / u_resolution;

  float d    = u_day;
  float sb   = sunBrightness(d);
  float night = 1.0 - smoothstep(0.15, 0.28, d) * smoothstep(0.85, 0.72, d);

  /* ── sky gradient ── */
  vec3 top = skyTop(d);
  vec3 bot = skyBot(d);
  vec3 col = mix(top, bot, pow(clamp(uv.y, 0.0, 1.0), 0.55));

  /* ── horizon glow (sunrise / sunset) ── */
  float isSunrise = smoothstep(0.20, 0.30, d) * smoothstep(0.38, 0.29, d);
  float isSunset  = smoothstep(0.62, 0.72, d) * smoothstep(0.83, 0.72, d);
  float glow      = max(isSunrise, isSunset);
  vec3  glowCol   = mix(vec3(1.00,0.62,0.22), vec3(1.00,0.35,0.18), isSunset);
  float hGlow     = smoothstep(0.55, 1.00, uv.y) * pow(uv.y, 2.0);
  col = mix(col, glowCol, hGlow * glow * 0.75);
  /* radial glow from horizon center */
  float hRadial = exp(-abs(uv.x - 0.5) * 3.5) * smoothstep(0.50, 1.0, uv.y);
  col = mix(col, glowCol * 1.3, hRadial * glow * 0.35);

  /* ── clouds ── */
  float c1 = cloudLayer(vec2(uv.x, uv.y*0.4+0.05), 0.0014, 0.00);
  float c2 = cloudLayer(vec2(uv.x, uv.y*0.3+0.10), 0.0009, 0.43);
  float c3 = cloudLayer(vec2(uv.x, uv.y*0.5+0.06), 0.0018, 0.77);
  float clouds = clamp(c1*0.55 + c2*0.80 + c3*0.45, 0.0, 1.0)
               * smoothstep(0.80, 0.20, uv.y)   /* fade toward horizon */
               * (sb * 0.7 + glow * 0.3);
  /* night clouds: barely visible deep-blue wisps */
  float nightClouds = clamp(c2 * 0.5 + c3 * 0.3, 0.0, 1.0)
                    * smoothstep(0.70, 0.15, uv.y) * night * 0.18;
  vec3 cloudDay   = mix(vec3(1.00), glowCol * 1.15, glow * 0.55);
  vec3 cloudNight = vec3(0.25, 0.30, 0.52);
  col = mix(col, cloudDay,   clamp(clouds, 0.0, 1.0));
  col = mix(col, cloudNight, clamp(nightClouds, 0.0, 1.0));

  /* ── stars ── */
  col += drawStars(uv, night);

  /* ── SUN — large visible disc that clearly travels across the screen ── */
  vec2  sp     = sunPos(d);
  float sd     = length(uv - sp);
  /* aspect correction so disc is round */
  float aspect = u_resolution.x / u_resolution.y;
  vec2  spAsp  = (uv - sp) * vec2(aspect, 1.0);
  float sdAsp  = length(spAsp);

  vec3  sunHue = mix(vec3(1.00,0.97,0.85), vec3(1.00,0.68,0.22), glow);

  /* disc radius ~3.5% of screen height */
  float disc   = smoothstep(0.038, 0.028, sdAsp) * sb;
  /* inner bright centre */
  float centre = smoothstep(0.018, 0.005, sdAsp) * sb;
  /* soft corona */
  float corona = exp(-sdAsp * sdAsp * 55.0)  * sb * 0.65;
  /* wide atmospheric scatter */
  float atmo   = exp(-sd    * sd    *  4.0)  * sb * 0.18;

  col  = col + sunHue * atmo;
  col  = col + sunHue * corona;
  col  = mix(col, sunHue * 1.1, disc);
  col  = mix(col, vec3(1.00, 0.99, 0.95), centre);

  /* ── MOON — glowing crescent disc, same arc opposite side ── */
  float moonD  = fract(d + 0.5);
  vec2  mp     = sunPos(moonD);
  float moonB  = clamp(smoothstep(0.28, 0.18, d) + smoothstep(0.72, 0.82, d), 0.0, 1.0);
  vec2  mpAsp  = (uv - mp) * vec2(aspect, 1.0);
  float mdAsp  = length(mpAsp);
  float mDist  = length(uv - mp);

  /* disc + crescent shadow (offset slightly) */
  vec2  shadowAsp = (uv - mp + vec2(0.022, 0.010)) * vec2(aspect, 1.0);
  float mDisc     = smoothstep(0.034, 0.025, mdAsp) * moonB;
  float mShadow   = smoothstep(0.034, 0.025, length(shadowAsp)) * moonB;
  float mGlow     = exp(-mDist * mDist * 80.0) * moonB * 0.45;

  col += vec3(0.50, 0.58, 0.80) * mGlow;
  /* crescent = disc minus shadow */
  col  = mix(col, vec3(0.93, 0.94, 0.90), clamp(mDisc - mShadow * 0.85, 0.0, 1.0));

  /* ── soft mouse glow ── */
  float md   = length(uv - mouse);
  col = mix(col, col + 0.12, exp(-md*md*7.0)  * 0.40);
  col = mix(col, col + 0.18, exp(-md*md*30.0) * 0.25);

  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}
`

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  return sh
}

interface SkyShaderProps {
  /** 0..1 — full day cycle driven by the timer progress */
  dayProgress: number
}

export function SkyShader({ dayProgress }: SkyShaderProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const dayRef     = useRef(dayProgress)
  useEffect(() => { dayRef.current = dayProgress }, [dayProgress])

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

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(prog, "a_position")
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uTime  = gl.getUniformLocation(prog, "u_time")
    const uDay   = gl.getUniformLocation(prog, "u_day")
    const uRes   = gl.getUniformLocation(prog, "u_resolution")
    const uMouse = gl.getUniformLocation(prog, "u_mouse")

    let targetX = window.innerWidth  / 2
    let targetY = window.innerHeight / 2
    let smoothX = targetX
    let smoothY = targetY

    const onMove = (e: MouseEvent) => { targetX = e.clientX; targetY = e.clientY }
    window.addEventListener("mousemove", onMove)

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener("resize", resize)

    let raf: number
    const t0 = performance.now()

    const render = () => {
      const t = (performance.now() - t0) / 1000
      smoothX += (targetX - smoothX) * 0.07
      smoothY += (targetY - smoothY) * 0.07

      gl.uniform1f(uTime,  t)
      gl.uniform1f(uDay,   dayRef.current)
      gl.uniform2f(uRes,   canvas.width, canvas.height)
      gl.uniform2f(uMouse, smoothX, smoothY)
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
