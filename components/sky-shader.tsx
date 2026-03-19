"use client"

import { useEffect, useRef } from "react"

// colorStops: time 0.0 = midnight, 0.5 = noon, 1.0 = midnight again
const colorStops: { time: number; top: number[]; bottom: number[] }[] = [
  { time: 0.00, top: [10,22,40],    bottom: [5,11,26]    },
  { time: 0.08, top: [15,26,50],    bottom: [8,13,30]    },
  { time: 0.15, top: [53,32,80],    bottom: [18,16,40]   },
  { time: 0.20, top: [107,58,106],  bottom: [58,36,72]   },
  { time: 0.25, top: [165,90,112],  bottom: [96,46,72]   },
  { time: 0.30, top: [216,106,117], bottom: [122,56,80]  },
  { time: 0.35, top: [236,142,122], bottom: [149,92,101] },
  { time: 0.40, top: [255,190,138], bottom: [202,112,101]},
  { time: 0.45, top: [255,232,202], bottom: [125,213,232]},
  { time: 0.50, top: [184,224,248], bottom: [112,218,250]},
  { time: 0.55, top: [200,229,248], bottom: [128,220,248]},
  { time: 0.60, top: [232,239,248], bottom: [160,224,240]},
  { time: 0.65, top: [245,232,216], bottom: [184,213,229]},
  { time: 0.70, top: [255,200,160], bottom: [208,181,192]},
  { time: 0.75, top: [255,152,112], bottom: [168,154,170]},
  { time: 0.80, top: [192,85,72],   bottom: [96,48,96]   },
  { time: 0.85, top: [128,58,56],   bottom: [53,21,64]   },
  { time: 0.90, top: [69,31,48],    bottom: [37,16,53]   },
  { time: 0.95, top: [31,21,40],    bottom: [13,9,28]    },
  { time: 1.00, top: [10,22,40],    bottom: [5,11,26]    },
]

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2
}

function lerp3(a: number[], b: number[], t: number): number[] {
  const e = easeInOutCubic(t)
  return [
    Math.round(a[0] + (b[0]-a[0])*e),
    Math.round(a[1] + (b[1]-a[1])*e),
    Math.round(a[2] + (b[2]-a[2])*e),
  ]
}

function skyGradient(p: number): string {
  const n = Math.min(Math.max(p, 0), 1)
  let lo = colorStops[0], hi = colorStops[1]
  for (let i = 0; i < colorStops.length - 1; i++) {
    if (n >= colorStops[i].time && n <= colorStops[i+1].time) {
      lo = colorStops[i]; hi = colorStops[i+1]; break
    }
  }
  const span = hi.time - lo.time || 1
  const lt   = (n - lo.time) / span
  const top  = lerp3(lo.top,    hi.top,    lt)
  const bot  = lerp3(lo.bottom, hi.bottom, lt)
  return `linear-gradient(to bottom, rgb(${top[0]},${top[1]},${top[2]}) 0%, rgb(${bot[0]},${bot[1]},${bot[2]}) 100%)`
}

const SKY_CSS = `
.ssky{position:fixed;inset:0;width:100%;height:100%;z-index:0;overflow:hidden;}
.ssky-stars{position:absolute;width:100%;height:100%;opacity:0;transition:opacity 3s ease-in-out;}
.ssky-star{position:absolute;background:white;border-radius:50%;animation:sskTwinkle 3s ease-in-out infinite;}
.ssky-star:nth-child(odd){animation-delay:-1.5s;}
.ssky-ss{position:absolute;background:white;border-radius:50%;opacity:0;box-shadow:0 0 6px 2px rgba(255,255,255,0.8);transition:opacity 2s ease-in-out;}
.ssky-ss::before{content:'';position:absolute;top:50%;left:50%;height:2px;background:linear-gradient(90deg,white,transparent);transform:translate(-100%,-50%);}
.ssky-ss1{width:3px;height:3px;top:8%;left:15%;animation:sskShoot1 16s ease-in infinite;animation-delay:15s;}
.ssky-ss1::before{width:150px;}
.ssky-ss2{width:2px;height:2px;top:18%;left:60%;animation:sskShoot2 8s ease-in infinite;animation-delay:45s;}
.ssky-ss2::before{width:80px;}
.ssky-ss3{width:1.5px;height:1.5px;top:12%;left:40%;animation:sskShoot3 12s ease-in infinite;animation-delay:75s;}
.ssky-ss3::before{width:100px;opacity:0.8;}
.ssky-body{position:absolute;left:50%;top:50%;width:80px;height:80px;margin-left:-40px;margin-top:-40px;border-radius:50%;will-change:transform,opacity;}
.ssky-cel-wrap{position:absolute;inset:0;pointer-events:none;transition:opacity 3s ease-in-out;}
.ssky-sun{background:radial-gradient(circle,#fff9e6 0%,#ffdb4d 30%,#ff9500 70%,#ff6b00 100%);box-shadow:0 0 40px rgba(255,200,0,.8),0 0 80px rgba(255,150,0,.5),0 0 120px rgba(255,100,0,.3);animation:sskOrbitSun 120s linear infinite,sskSunGlow 120s linear infinite;}
.ssky-moon{background:radial-gradient(circle,#fff 0%,#e8ecf0 40%,#b0b8c0 100%);box-shadow:0 0 20px rgba(255,255,255,.4),0 0 40px rgba(200,220,255,.2);animation:sskOrbitMoon 120s linear infinite,sskMoonGlow 120s linear infinite;}
.ssky-moon::before{content:'';position:absolute;width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 30% 30%,rgba(0,0,0,.1) 8%,transparent 8%),radial-gradient(circle at 60% 50%,rgba(0,0,0,.08) 12%,transparent 12%),radial-gradient(circle at 45% 70%,rgba(0,0,0,.06) 6%,transparent 6%),radial-gradient(circle at 75% 35%,rgba(0,0,0,.07) 10%,transparent 10%);}
.ssky-cloud{position:absolute;opacity:0;will-change:transform,opacity;transition:opacity 3s ease-in-out;}
.ssky-clayer{position:absolute;background:rgba(255,255,255,.7);border-radius:100px;filter:blur(8px);}
.ssky-c1{top:20%;left:-200px;animation:sskDrift1 80s linear infinite;}
.ssky-c1 .ssky-clayer:nth-child(1){width:100px;height:40px;}
.ssky-c1 .ssky-clayer:nth-child(2){width:120px;height:50px;left:40px;top:-10px;}
.ssky-c1 .ssky-clayer:nth-child(3){width:80px;height:35px;left:90px;top:5px;}
.ssky-c2{top:35%;left:-200px;animation:sskDrift2 100s linear infinite;animation-delay:-30s;}
.ssky-c2 .ssky-clayer:nth-child(1){width:90px;height:35px;}
.ssky-c2 .ssky-clayer:nth-child(2){width:110px;height:45px;left:30px;top:-8px;}
.ssky-c2 .ssky-clayer:nth-child(3){width:70px;height:30px;left:80px;top:3px;}
.ssky-c3{top:55%;left:-200px;animation:sskDrift3 120s linear infinite;animation-delay:-60s;}
.ssky-c3 .ssky-clayer:nth-child(1){width:110px;height:45px;}
.ssky-c3 .ssky-clayer:nth-child(2){width:130px;height:55px;left:45px;top:-12px;}
.ssky-c3 .ssky-clayer:nth-child(3){width:90px;height:40px;left:100px;top:5px;}
.ssky-haze{position:absolute;bottom:0;width:100%;height:30%;background:linear-gradient(to top,rgba(255,255,255,.1),transparent);opacity:0;transition:opacity 3s ease-in-out;}
@keyframes sskOrbitSun{
  0%  {transform:translate(0,70vh) rotate(0deg) translateX(45vw) rotate(0deg);opacity:0;}
  10% {opacity:1;}
  25% {transform:translate(0,0) rotate(90deg) translateX(45vw) rotate(-90deg);}
  50% {transform:translate(0,-30vh) rotate(180deg) translateX(45vw) rotate(-180deg);}
  75% {transform:translate(0,0) rotate(270deg) translateX(45vw) rotate(-270deg);}
  90% {opacity:1;}
  100%{transform:translate(0,70vh) rotate(360deg) translateX(45vw) rotate(-360deg);opacity:0;}
}
@keyframes sskOrbitMoon{
  0%  {transform:translate(0,-30vh) rotate(180deg) translateX(45vw) rotate(-180deg);opacity:1;}
  10% {opacity:1;}
  25% {transform:translate(0,0) rotate(270deg) translateX(45vw) rotate(-270deg);}
  40% {opacity:1;}
  50% {transform:translate(0,70vh) rotate(360deg) translateX(45vw) rotate(-360deg);opacity:0;}
  60% {opacity:0;}
  75% {transform:translate(0,0) rotate(450deg) translateX(45vw) rotate(-450deg);opacity:1;}
  90% {opacity:1;}
  100%{transform:translate(0,-30vh) rotate(540deg) translateX(45vw) rotate(-540deg);}
}
@keyframes sskSunGlow{
  0%,100%{filter:brightness(.3);}
  20%    {filter:brightness(1.2);}
  50%    {filter:brightness(1.3);}
  80%    {filter:brightness(.9);}
}
@keyframes sskMoonGlow{
  0%,100%{filter:brightness(1);}
  50%    {filter:brightness(.3);}
}
@keyframes sskTwinkle{
  0%,100%{opacity:1;transform:scale(1);}
  50%    {opacity:.3;transform:scale(.8);}
}
@keyframes sskShoot1{
  0%  {transform:translate(0,0) rotate(45deg);opacity:0;}
  5%  {opacity:1;}
  100%{transform:translate(80vw,80vh) rotate(45deg);opacity:0;}
}
@keyframes sskShoot2{
  0%  {transform:translate(0,0) rotate(45deg);opacity:0;}
  8%  {opacity:1;}
  100%{transform:translate(60vw,60vh) rotate(45deg);opacity:0;}
}
@keyframes sskShoot3{
  0%  {transform:translate(0,0) rotate(45deg);opacity:0;}
  6%  {opacity:1;}
  100%{transform:translate(70vw,70vh) rotate(45deg);opacity:0;}
}
@keyframes sskDrift1{from{transform:translateX(0);}to{transform:translateX(calc(100vw + 400px));}}
@keyframes sskDrift2{from{transform:translateX(0);}to{transform:translateX(calc(100vw + 400px));}}
@keyframes sskDrift3{from{transform:translateX(0);}to{transform:translateX(calc(100vw + 400px));}}
@media(max-width:768px){.ssky-body{width:60px;height:60px;margin-left:-30px;margin-top:-30px;}}
`

interface SkyShaderProps {
  /** 0..1 — full day cycle driven by the timer progress */
  dayProgress: number
}

export function SkyShader({ dayProgress }: SkyShaderProps) {
  const skyRef      = useRef<HTMLDivElement>(null)
  const starsRef    = useRef<HTMLDivElement>(null)
  const ss1Ref      = useRef<HTMLDivElement>(null)
  const ss2Ref      = useRef<HTMLDivElement>(null)
  const ss3Ref      = useRef<HTMLDivElement>(null)
  const sunWrapRef  = useRef<HTMLDivElement>(null)
  const moonWrapRef = useRef<HTMLDivElement>(null)
  const c1Ref       = useRef<HTMLDivElement>(null)
  const c2Ref       = useRef<HTMLDivElement>(null)
  const c3Ref       = useRef<HTMLDivElement>(null)
  const hazeRef     = useRef<HTMLDivElement>(null)

  // Generate stars on mount
  useEffect(() => {
    const stars = starsRef.current
    if (!stars) return
    for (let i = 0; i < 150; i++) {
      const star = document.createElement("div")
      star.className = "ssky-star"
      const size = Math.random() * 2 + 0.5
      star.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;top:${Math.random()*100}%;animation-delay:${Math.random()*3}s;animation-duration:${Math.random()*2+2}s`
      stars.appendChild(star)
    }
  }, [])

  // Update background gradient + element visibility based on dayProgress
  useEffect(() => {
    const sky = skyRef.current
    if (!sky) return

    sky.style.background = skyGradient(dayProgress)

    const isNight = dayProgress < 0.15 || dayProgress > 0.75
    const isDay   = dayProgress > 0.20 && dayProgress < 0.80

    if (starsRef.current) starsRef.current.style.opacity = isNight ? "1" : "0"
    const ssOp = isNight ? "" : "0"
    if (ss1Ref.current) ss1Ref.current.style.opacity = ssOp
    if (ss2Ref.current) ss2Ref.current.style.opacity = ssOp
    if (ss3Ref.current) ss3Ref.current.style.opacity = ssOp

    if (sunWrapRef.current)  sunWrapRef.current.style.opacity  = isDay   ? "1" : "0"
    if (moonWrapRef.current) moonWrapRef.current.style.opacity = isNight ? "1" : "0"

    const cloudOp = isDay ? "0.9" : "0"
    if (c1Ref.current) c1Ref.current.style.opacity = cloudOp
    if (c2Ref.current) c2Ref.current.style.opacity = cloudOp
    if (c3Ref.current) c3Ref.current.style.opacity = cloudOp

    if (hazeRef.current)
      hazeRef.current.style.opacity = (dayProgress > 0.20 && dayProgress < 0.80) ? "0.5" : "0"
  }, [dayProgress])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SKY_CSS }} />
      <div ref={skyRef} className="ssky">
        <div ref={starsRef} className="ssky-stars" />
        <div ref={ss1Ref} className="ssky-ss ssky-ss1" />
        <div ref={ss2Ref} className="ssky-ss ssky-ss2" />
        <div ref={ss3Ref} className="ssky-ss ssky-ss3" />
        <div ref={sunWrapRef} className="ssky-cel-wrap" style={{opacity:0}}>
          <div className="ssky-body ssky-sun" />
        </div>
        <div ref={moonWrapRef} className="ssky-cel-wrap" style={{opacity:0}}>
          <div className="ssky-body ssky-moon" />
        </div>
        <div ref={c1Ref} className="ssky-cloud ssky-c1">
          <div className="ssky-clayer" /><div className="ssky-clayer" /><div className="ssky-clayer" />
        </div>
        <div ref={c2Ref} className="ssky-cloud ssky-c2">
          <div className="ssky-clayer" /><div className="ssky-clayer" /><div className="ssky-clayer" />
        </div>
        <div ref={c3Ref} className="ssky-cloud ssky-c3">
          <div className="ssky-clayer" /><div className="ssky-clayer" /><div className="ssky-clayer" />
        </div>
        <div ref={hazeRef} className="ssky-haze" />
      </div>
    </>
  )
}
