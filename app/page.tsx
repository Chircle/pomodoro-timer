"use client"

import { useState, useEffect, useRef } from "react"
import { BackgroundShader } from "@/components/background-shader"
import { SkyShader } from "@/components/sky-shader"
import { PomodoroHeader } from "@/components/pomodoro-header"
import { TimerRing } from "@/components/timer-ring"
import { RoundDots } from "@/components/round-dots"
import { type Phase, BREAK_DURATION, CIRCUMFERENCE, playDingSound } from "@/lib/pomodoro"
import "./pomodoro.css"

const FOCUS_TRACKS = [
  'dark-mode-build.mp3',
  'Moss On My Notebook.mp3',
  'Soft Debugging Lights.mp3',
  'Moss On My Notebook-happier.mp3',
]
const BREAK_TRACKS = [
  'sunny-nap-plushies.mp3',
  'Moss On My Notebook-happier.mp3',
]
const FADE_SECS = 3

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

export default function PomodoroPage() {
  const [totalRounds, setTotalRounds] = useState(4)
  const [currentRound, setCurrentRound] = useState(1)
  const [focusMins, setFocusMins] = useState(25)
  const [phase, setPhase] = useState<Phase>("idle")
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [musicOn, setMusicOn] = useState(true)
  const [volume, setVolume] = useState(0.1)

  // Mirror mutable state in refs so callbacks never go stale
  const volumeRef = useRef(volume)
  const musicOnRef = useRef(musicOn)

  // Two audio elements for focus crossfade (A/B alternating)
  const audioA = useRef<HTMLAudioElement | null>(null)
  const audioB = useRef<HTMLAudioElement | null>(null)
  const activeIsA = useRef(true)            // which element is currently playing
  const breakAudio = useRef<HTMLAudioElement | null>(null)

  // Focus playlist state
  const focusPlaylist = useRef<string[]>([])
  const focusTrackIdx = useRef(0)           // index of the currently playing track

  // Crossfade / polling
  const isCrossfading = useRef(false)
  const crossfadeRaf = useRef<number | null>(null)
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const dingTriggered = useRef(false)

  const audioUrl = (name: string) => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
    return `${base}/audio/${name}`
  }

  const getActive = () => activeIsA.current ? audioA.current : audioB.current
  const getIdle   = () => activeIsA.current ? audioB.current : audioA.current

  // ── helpers ────────────────────────────────────────────────────────────────
  const stopCrossfade = () => {
    if (crossfadeRaf.current) { cancelAnimationFrame(crossfadeRaf.current); crossfadeRaf.current = null }
    isCrossfading.current = false
  }

  const stopPoll = () => {
    if (pollInterval.current) { clearInterval(pollInterval.current); pollInterval.current = null }
  }

  const stopFocusAudio = () => {
    stopPoll()
    stopCrossfade()
    audioA.current?.pause()
    audioB.current?.pause()
    if (audioA.current) audioA.current.volume = 0
    if (audioB.current) audioB.current.volume = 0
  }

  /** Load the track at (focusTrackIdx + offset) into the idle element */
  const preloadNextTrack = (offset = 1) => {
    const idle = getIdle()
    if (!idle) return
    const idx = (focusTrackIdx.current + offset) % focusPlaylist.current.length
    idle.src = audioUrl(focusPlaylist.current[idx])
    idle.volume = 0
    idle.load()
  }

  const startCrossfade = () => {
    if (isCrossfading.current) return
    const curr = getActive()
    const next = getIdle()
    if (!curr || !next) return

    next.currentTime = 0
    next.volume = 0
    next.play().catch(() => {})

    isCrossfading.current = true
    const startTime = performance.now()

    const animate = () => {
      const t = Math.min((performance.now() - startTime) / 1000 / FADE_SECS, 1)
      const vol = musicOnRef.current ? volumeRef.current : 0
      curr.volume = vol * (1 - t)
      next.volume = vol * t

      if (t < 1) {
        crossfadeRaf.current = requestAnimationFrame(animate)
      } else {
        curr.pause()
        curr.currentTime = 0
        curr.volume = 0
        next.volume = vol
        // Advance playlist and flip active element
        focusTrackIdx.current = (focusTrackIdx.current + 1) % focusPlaylist.current.length
        activeIsA.current = !activeIsA.current
        // Preload the track after the one now playing into the (now idle) element
        preloadNextTrack(1)
        isCrossfading.current = false
        crossfadeRaf.current = null
      }
    }

    crossfadeRaf.current = requestAnimationFrame(animate)
  }

  const startPoll = () => {
    stopPoll()
    pollInterval.current = setInterval(() => {
      const curr = getActive()
      if (!curr || isCrossfading.current) return
      const { duration, currentTime } = curr
      if (duration && !isNaN(duration) && currentTime > 0) {
        const remaining = duration - currentTime
        if (remaining > 0 && remaining <= FADE_SECS) startCrossfade()
      }
    }, 300)
  }

  // ── init audio on client ───────────────────────────────────────────────────
  useEffect(() => {
    audioA.current = new Audio(); audioA.current.volume = 0
    audioB.current = new Audio(); audioB.current.volume = 0
    breakAudio.current = new Audio(audioUrl(pickRandom(BREAK_TRACKS)))
    breakAudio.current.volume = volume
    breakAudio.current.loop = true
    return () => {
      audioA.current?.pause()
      audioB.current?.pause()
      breakAudio.current?.pause()
      stopPoll()
      stopCrossfade()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep refs in sync with state
  useEffect(() => { volumeRef.current = volume }, [volume])
  useEffect(() => { musicOnRef.current = musicOn }, [musicOn])

  // Sync volume / mute (not during crossfade — that animates its own volumes)
  useEffect(() => {
    if (isCrossfading.current) return
    const vol = musicOn ? volume : 0
    const active = getActive()
    if (active) active.volume = vol
    if (breakAudio.current) breakAudio.current.volume = vol
  }, [volume, musicOn])

  // Manage music based on phase + running state
  useEffect(() => {
    if (phase === "focus" && isRunning && musicOn) {
      breakAudio.current?.pause()
      // Resume or start the active focus track
      if (isCrossfading.current) {
        // Was paused mid-crossfade — cancel and reset idle element
        stopCrossfade()
        const idle = getIdle()
        if (idle) { idle.pause(); idle.volume = 0 }
      }
      const active = getActive()
      if (active?.src) {
        active.volume = volume
        active.play().catch(() => {})
        startPoll()
      }
    } else if (phase === "break" && isRunning && musicOn) {
      stopFocusAudio()
      breakAudio.current?.play().catch(() => {})
    } else {
      stopFocusAudio()
      breakAudio.current?.pause()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isRunning, musicOn])

  // Countdown tick
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [isRunning])

  // Ding bei 3, 2, 1, 0 Sekunden
  useEffect(() => {
    if (isRunning && timeLeft <= 3) {
      playDingSound(timeLeft)
    }
  }, [timeLeft, isRunning])

  // Phase transition at 0
  useEffect(() => {
    if (timeLeft !== 0 || !isRunning) return
    dingTriggered.current = false

    if (phase === "focus") {
      if (currentRound >= totalRounds) {
        setPhase("done")
        setIsRunning(false)
      } else {
        stopFocusAudio()
        if (breakAudio.current) {
          breakAudio.current.src = audioUrl(pickRandom(BREAK_TRACKS))
          breakAudio.current.currentTime = 0
        }
        setPhase("break")
        setTimeLeft(BREAK_DURATION)
      }
    } else if (phase === "break") {
      // Continue playlist into the next focus round
      focusTrackIdx.current = (focusTrackIdx.current + 1) % focusPlaylist.current.length
      activeIsA.current = true
      if (audioA.current) {
        audioA.current.src = audioUrl(focusPlaylist.current[focusTrackIdx.current])
        audioA.current.currentTime = 0
        audioA.current.volume = musicOn ? volume : 0
      }
      preloadNextTrack(1)
      setCurrentRound(r => r + 1)
      setPhase("focus")
      setTimeLeft(focusMins * 60)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isRunning, phase, currentRound, totalRounds])

  const start = () => {
    // Build shuffled playlist and load first two tracks
    focusPlaylist.current = shuffle(FOCUS_TRACKS)
    focusTrackIdx.current = 0
    activeIsA.current = true
    stopCrossfade()

    if (audioA.current) {
      audioA.current.src = audioUrl(focusPlaylist.current[0])
      audioA.current.currentTime = 0
      audioA.current.volume = musicOn ? volume : 0
    }
    if (audioB.current) {
      audioB.current.src = audioUrl(focusPlaylist.current[1 % focusPlaylist.current.length])
      audioB.current.volume = 0
      audioB.current.load()
    }

    dingTriggered.current = false
    setCurrentRound(1)
    setPhase("focus")
    setTimeLeft(focusMins * 60)
    setIsRunning(true)
  }

  const stop = () => {
    stopFocusAudio()
    breakAudio.current?.pause()
    setIsRunning(false)
    setPhase("idle")
    setCurrentRound(1)
    setTimeLeft(focusMins * 60)
    dingTriggered.current = false
  }

  const togglePause = () => setIsRunning(r => !r)

  const totalD = phase === "break" ? BREAK_DURATION : focusMins * 60
  const progress = phase !== "idle" && phase !== "done" ? (totalD - timeLeft) / totalD : 0
  const dashOffset = CIRCUMFERENCE * (1 - progress)

  const isSkyRound = phase !== "idle" && currentRound % 2 === 0
  const dayProgress = progress

  const phaseLabel =
    phase === "focus" ? "🍅 fokuszeit"
    : phase === "break" ? "☁️ pausenzeit"
    : phase === "done" ? "🌸 geschafft!"
    : "✨ bereit?"

  return (
    <div className="pomodoro-root">
      {isSkyRound
        ? <SkyShader dayProgress={dayProgress} />
        : <BackgroundShader phase={phase} />
      }

      <PomodoroHeader
        phase={phase}
        isRunning={isRunning}
        focusMins={focusMins}
        setFocusMins={setFocusMins}
        totalRounds={totalRounds}
        setTotalRounds={setTotalRounds}
        musicOn={musicOn}
        setMusicOn={setMusicOn}
        volume={volume}
        setVolume={setVolume}
        setTimeLeft={setTimeLeft}
        onStart={start}
        onStop={stop}
        onTogglePause={togglePause}
      />

      <main>
        <div className={`phase-badge badge-${phase}`}>{phaseLabel}</div>

        {phase !== "done" ? (
          <TimerRing
            phase={phase}
            timeLeft={timeLeft}
            dashOffset={dashOffset}
            currentRound={currentRound}
            totalRounds={totalRounds}
          />
        ) : (
          <div className="done-msg">
            🎉 super gemacht!<br />
            alle {totalRounds} runden geschafft! 🌸✨
          </div>
        )}

        <RoundDots
          totalRounds={totalRounds}
          currentRound={currentRound}
          phase={phase}
          onSelectRound={i => {
            dingTriggered.current = false
            setCurrentRound(i + 1)
            setPhase("focus")
            setTimeLeft(focusMins * 60)
            setIsRunning(true)
          }}
        />
      </main>
    </div>
  )
}
