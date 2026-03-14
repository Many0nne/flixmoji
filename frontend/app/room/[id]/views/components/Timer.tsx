'use client'

interface TimerProps {
  remainingMs: number
  totalMs: number
}

export default function Timer({ remainingMs, totalMs }: TimerProps) {
  const seconds = Math.ceil(remainingMs / 1000)
  const ratio = totalMs > 0 ? remainingMs / totalMs : 0

  const color =
    ratio > 0.5 ? 'text-green-400' :
    ratio > 0.25 ? 'text-yellow-400' :
    'text-red-400'

  const ringColor =
    ratio > 0.5 ? 'stroke-green-400' :
    ratio > 0.25 ? 'stroke-yellow-400' :
    'stroke-red-400'

  const circumference = 2 * Math.PI * 20
  const offset = circumference * (1 - ratio)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="#374151" strokeWidth="4" />
          <circle
            cx="24" cy="24" r="20"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${ringColor} transition-all duration-1000`}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-lg font-black ${color}`}>
          {seconds}
        </span>
      </div>
    </div>
  )
}
