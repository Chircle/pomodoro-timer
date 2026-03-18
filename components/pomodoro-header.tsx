"use client"

import type { Phase } from "@/lib/pomodoro"

interface Props {
  phase: Phase
  isRunning: boolean
  focusMins: number
  setFocusMins: (v: number) => void
  totalRounds: number
  setTotalRounds: (fn: (r: number) => number) => void
  musicOn: boolean
  setMusicOn: (fn: (m: boolean) => boolean) => void
  volume: number
  setVolume: (v: number) => void
  setTimeLeft: (v: number) => void
  onStart: () => void
  onStop: () => void
  onTogglePause: () => void
}

export function PomodoroHeader({
  phase, isRunning,
  focusMins, setFocusMins,
  totalRounds, setTotalRounds,
  musicOn, setMusicOn,
  volume, setVolume,
  setTimeLeft,
  onStart, onStop, onTogglePause,
}: Props) {
  const locked = isRunning || phase === "focus" || phase === "break"

  return (
    <header>
      <span className="header-title">🌸 pomodoro</span>

      {/* Music toggle */}
      <button
        className={`btn btn-music${musicOn ? "" : " off"}`}
        onClick={() => setMusicOn(m => !m)}
        title={musicOn ? "musik aus" : "musik an"}
      >
        {musicOn ? "🎵" : "🔇"}
      </button>

      {/* Volume */}
      <div className="volume-wrap">
        <span className="volume-icon">
          {volume === 0 ? "🔈" : volume < 0.5 ? "🔉" : "🔊"}
        </span>
        <input
          type="range"
          className="volume-slider"
          min={0} max={1} step={0.01}
          value={volume}
          onChange={e => setVolume(parseFloat(e.target.value))}
          style={{ "--pct": `${volume * 100}%` } as React.CSSProperties}
        />
      </div>

      {/* Focus duration */}
      <div className="rounds-control">
        <span className="rounds-label">fokus</span>
        <button
          className="rounds-btn"
          onClick={() => {
            const v = Math.max(1, focusMins - 5)
            setFocusMins(v)
            if (phase === "idle") setTimeLeft(v * 60)
          }}
          disabled={locked}
        >−</button>
        <span className="rounds-value">
          {focusMins}
          <span style={{ fontSize: "0.6rem", fontWeight: 700, opacity: 0.7 }}>m</span>
        </span>
        <button
          className="rounds-btn"
          onClick={() => {
            const v = Math.min(25, focusMins + 5)
            setFocusMins(v)
            if (phase === "idle") setTimeLeft(v * 60)
          }}
          disabled={locked}
        >+</button>
      </div>

      {/* Rounds */}
      <div className="rounds-control">
        <span className="rounds-label">runden</span>
        <button
          className="rounds-btn"
          onClick={() => setTotalRounds(r => Math.max(1, r - 1))}
          disabled={locked}
        >−</button>
        <span className="rounds-value">{totalRounds}</span>
        <button
          className="rounds-btn"
          onClick={() => setTotalRounds(r => Math.min(12, r + 1))}
          disabled={locked}
        >+</button>
      </div>

      {/* Start / Pause / Stop */}
      {(phase === "idle" || phase === "done") && (
        <button className="btn btn-start" onClick={onStart}>
          {phase === "done" ? "🔁 nochmal" : "▶ start"}
        </button>
      )}

      {(phase === "focus" || phase === "break") && (
        <>
          <button className="btn btn-pause" onClick={onTogglePause}>
            {isRunning ? "⏸ pause" : "▶ fortsetzen"}
          </button>
          <button className="btn btn-stop" onClick={onStop}>
            ⏹ stop
          </button>
        </>
      )}
    </header>
  )
}
