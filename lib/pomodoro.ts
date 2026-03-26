export type Phase = "idle" | "focus" | "break" | "done"

export const BREAK_DURATION = 5 * 60
export const CIRCUMFERENCE  = 2 * Math.PI * 110

let _warnCtx: AudioContext | null = null

function getWarnCtx(): AudioContext {
  if (!_warnCtx || _warnCtx.state === "closed") {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    _warnCtx = new AudioCtx()
  }
  return _warnCtx
}

function beep(freq: number, duration: number, volume: number) {
  try {
    const ctx  = getWarnCtx()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    gain.gain.value     = volume
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {
    // silently ignore
  }
}

/** Call this every second with the current timeLeft value (3, 2, 1, 0). */
export function playDingSound(timeLeft: number, volume = 0.1) {
  if (timeLeft === 3 || timeLeft === 2 || timeLeft === 1) beep(700, 0.15, volume)
  if (timeLeft === 0) beep(1200, 0.5, volume)
}
