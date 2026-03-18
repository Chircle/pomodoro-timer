"use client"

import { useState, useEffect, useRef } from "react"
import { BackgroundShader } from "@/components/background-shader"
import { SkyShader } from "@/components/sky-shader"
import { PomodoroHeader } from "@/components/pomodoro-header"
import { TimerRing } from "@/components/timer-ring"
import { RoundDots } from "@/components/round-dots"
import { type Phase, BREAK_DURATION, CIRCUMFERENCE, playDingSound } from "@/lib/pomodoro"
import "./pomodoro.css"

export default function PomodoroPage() {
  const [totalRounds, setTotalRounds] = useState(4)
  const [currentRound, setCurrentRound] = useState(1)
  const [focusMins, setFocusMins] = useState(25)
  const [phase, setPhase] = useState<Phase>("idle")
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [musicOn, setMusicOn] = useState(true)
  const [volume, setVolume] = useState(0.1)

  const focusAudio = useRef<HTMLAudioElement | null>(null)
  const breakAudio = useRef<HTMLAudioElement | null>(null)
  const dingTriggered = useRef(false)

  // Init audio on client only
  useEffect(() => {
    focusAudio.current = new Audio("/audio/dark-mode-build.mp3")
    focusAudio.current.volume = volume
    focusAudio.current.loop = true
    breakAudio.current = new Audio("/audio/sunny-nap-plushies.mp3")
    breakAudio.current.volume = volume
    breakAudio.current.loop = true
    return () => {
      focusAudio.current?.pause()
      breakAudio.current?.pause()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync volume to audio elements
  useEffect(() => {
    if (focusAudio.current) focusAudio.current.volume = musicOn ? volume : 0
    if (breakAudio.current) breakAudio.current.volume = musicOn ? volume : 0
  }, [volume, musicOn])

  // Manage music based on phase + running state
  useEffect(() => {
    if (phase === "focus" && isRunning && musicOn) {
      breakAudio.current?.pause()
      focusAudio.current?.play().catch(() => {})
    } else if (phase === "break" && isRunning && musicOn) {
      focusAudio.current?.pause()
      breakAudio.current?.play().catch(() => {})
    } else if (!musicOn) {
      focusAudio.current?.pause()
      breakAudio.current?.pause()
    } else {
      focusAudio.current?.pause()
      breakAudio.current?.pause()
    }
  }, [phase, isRunning, musicOn])

  // Countdown tick
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [isRunning])

  // Ding when 4 seconds remain
  useEffect(() => {
    if (isRunning && timeLeft === 4 && !dingTriggered.current) {
      dingTriggered.current = true
      playDingSound()
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
        setPhase("break")
        setTimeLeft(BREAK_DURATION)
      }
    } else if (phase === "break") {
      setCurrentRound(r => r + 1)
      setPhase("focus")
      setTimeLeft(focusMins * 60)
    }
  }, [timeLeft, isRunning, phase, currentRound, totalRounds])

  const start = () => {
    dingTriggered.current = false
    setCurrentRound(1)
    setPhase("focus")
    setTimeLeft(focusMins * 60)
    setIsRunning(true)
  }

  const stop = () => {
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
