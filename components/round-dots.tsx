import type { Phase } from "@/lib/pomodoro"

interface Props {
  totalRounds: number
  currentRound: number
  phase: Phase
  onSelectRound: (index: number) => void
}

export function RoundDots({ totalRounds, currentRound, phase, onSelectRound }: Props) {
  return (
    <div className="round-dots">
      {Array.from({ length: totalRounds }, (_, i) => {
        const num = i + 1
        const done = phase !== "idle" && num < currentRound
        const active = phase !== "idle" && num === currentRound
        return (
          <button
            key={i}
            className={`dot${done ? " dot-done" : ""}${active ? " dot-current" : ""}`}
            onClick={() => onSelectRound(i)}
            aria-label={`Runde ${num}`}
          />
        )
      })}
    </div>
  )
}
