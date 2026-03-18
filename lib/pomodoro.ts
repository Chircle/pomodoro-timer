export type Phase = "idle" | "focus" | "break" | "done"

export const BREAK_DURATION = 5 * 60
export const CIRCUMFERENCE  = 2 * Math.PI * 110

export function playDingSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()

    const notes = [
      { t: 0.0, f: 1047, d: 0.3, type: "sine"     as OscillatorType },
      { t: 0.4, f: 1175, d: 0.3, type: "sine"     as OscillatorType },
      { t: 0.8, f: 1319, d: 0.3, type: "sine"     as OscillatorType },
      { t: 1.3, f: 523,  d: 1.2, type: "sawtooth" as OscillatorType },
    ]

    notes.forEach(({ t, f, d, type }) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type           = type
      osc.frequency.value = f
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + t)
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + d)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + d + 0.1)
    })

    setTimeout(() => ctx.close(), 3500)
  } catch {
    // silently ignore
  }
}
