import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronLeft, RotateCcw, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { loadSnakeLeaderboard, saveSnakeScore, type SnakeScoreRecord } from '@/lib/snakeLeaderboard'

const BOARD_SIZE = 16
const TICK_MS = 180

interface Point {
  x: number
  y: number
}

interface SnakeGameState {
  status: 'ready' | 'playing' | 'gameover'
  snake: Point[]
  direction: Point
  food: Point
  score: number
  saved: boolean
}

interface SnakeViewProps {
  onBack: () => void
}

const INITIAL_SNAKE: Point[] = [
  { x: 7, y: 8 },
  { x: 6, y: 8 },
  { x: 5, y: 8 },
]

const INITIAL_FOOD: Point = { x: 11, y: 8 }
const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
} as const

function createReadyState(): SnakeGameState {
  return {
    status: 'ready',
    snake: INITIAL_SNAKE,
    direction: DIRECTIONS.right,
    food: INITIAL_FOOD,
    score: 0,
    saved: false,
  }
}

function samePoint(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y
}

function isReverse(current: Point, next: Point) {
  return current.x + next.x === 0 && current.y + next.y === 0
}

function nextFood(snake: Point[]): Point {
  const occupied = new Set(snake.map((part) => `${part.x}:${part.y}`))
  const freeCells: Point[] = []
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (!occupied.has(`${x}:${y}`)) freeCells.push({ x, y })
    }
  }
  return freeCells[Math.floor(Math.random() * freeCells.length)] ?? INITIAL_FOOD
}

function advanceGame(state: SnakeGameState): SnakeGameState {
  if (state.status !== 'playing') return state
  const head = state.snake[0]
  const nextHead = { x: head.x + state.direction.x, y: head.y + state.direction.y }
  const hitWall = nextHead.x < 0 || nextHead.y < 0 || nextHead.x >= BOARD_SIZE || nextHead.y >= BOARD_SIZE
  const hitSelf = state.snake.some((part) => samePoint(part, nextHead))
  if (hitWall || hitSelf) return { ...state, status: 'gameover' }

  const ateFood = samePoint(nextHead, state.food)
  const snake = ateFood ? [nextHead, ...state.snake] : [nextHead, ...state.snake.slice(0, -1)]
  return {
    ...state,
    snake,
    food: ateFood ? nextFood(snake) : state.food,
    score: ateFood ? state.score + 10 : state.score,
  }
}

export function SnakeView({ onBack }: SnakeViewProps) {
  const { t } = useTranslation()
  const [game, setGame] = useState<SnakeGameState>(() => createReadyState())
  const [leaderboard, setLeaderboard] = useState<SnakeScoreRecord[]>(() => loadSnakeLeaderboard())
  const savedGameRef = useRef<string | null>(null)
  const occupiedCells = useMemo(() => new Map(game.snake.map((part, index) => [`${part.x}:${part.y}`, index])), [game.snake])

  useEffect(() => {
    if (game.status !== 'playing') return undefined
    const timer = window.setInterval(() => setGame((current) => advanceGame(current)), TICK_MS)
    return () => window.clearInterval(timer)
  }, [game.status])

  useEffect(() => {
    if (game.status !== 'gameover' || game.saved) return
    const gameKey = `${game.score}:${game.snake.map((part) => `${part.x}-${part.y}`).join(',')}`
    if (savedGameRef.current === gameKey) return
    savedGameRef.current = gameKey
    const records = saveSnakeScore(game.score)
    setLeaderboard(records)
    setGame((current) => ({ ...current, saved: true }))
  }, [game.saved, game.score, game.snake, game.status])

  const startGame = () => {
    savedGameRef.current = null
    setGame({ ...createReadyState(), status: 'playing' })
  }
  const resetGame = () => {
    savedGameRef.current = null
    setGame(createReadyState())
  }
  const finishGame = () => setGame((current) => (current.status === 'playing' ? { ...current, status: 'gameover' } : current))

  const changeDirection = useCallback((direction: Point) => {
    setGame((current) => {
      if (current.status !== 'playing' || isReverse(current.direction, direction)) return current
      return { ...current, direction }
    })
  }, [])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const keyMap: Record<string, Point | undefined> = {
        ArrowUp: DIRECTIONS.up,
        w: DIRECTIONS.up,
        W: DIRECTIONS.up,
        ArrowDown: DIRECTIONS.down,
        s: DIRECTIONS.down,
        S: DIRECTIONS.down,
        ArrowLeft: DIRECTIONS.left,
        a: DIRECTIONS.left,
        A: DIRECTIONS.left,
        ArrowRight: DIRECTIONS.right,
        d: DIRECTIONS.right,
        D: DIRECTIONS.right,
      }
      const direction = keyMap[event.key]
      if (!direction) return
      event.preventDefault()
      changeDirection(direction)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [changeDirection])

  return (
    <main className="min-h-screen bg-rice-100 paper-noise">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6 lg:py-7">
        <section className="rounded-3xl border border-white/80 bg-white/90 p-4 shadow-float backdrop-blur sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ChevronLeft size={16} />{t('snake.back')}
            </Button>
            <div className="ml-auto rounded-2xl bg-rice-100 px-4 py-2 text-sm font-bold text-charcoal-700">
              {t('snake.current_score')} <span data-testid="snake-score" className="font-mono text-lg text-chili-500">{game.score}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(280px,560px)_1fr]">
            <div>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold tracking-widest text-chili-500">{t('snake.badge')}</p>
                  <h1 className="mt-1 text-3xl font-extrabold text-charcoal-900 sm:text-4xl">{t('snake.title')}</h1>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-2 text-sm font-bold text-charcoal-700">{t(`snake.status.${game.status}`)}</span>
              </div>

              <div
                aria-label={t('snake.board')}
                className="grid aspect-square w-full overflow-hidden rounded-2xl border border-charcoal-900/10 bg-rice-200 p-2 shadow-inner"
                style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, cellIndex) => {
                  const point = { x: cellIndex % BOARD_SIZE, y: Math.floor(cellIndex / BOARD_SIZE) }
                  const snakeIndex = occupiedCells.get(`${point.x}:${point.y}`)
                  const isFood = samePoint(point, game.food)
                  const cellClass = snakeIndex === 0
                    ? 'bg-charcoal-900'
                    : typeof snakeIndex === 'number'
                      ? 'bg-chili-500'
                      : isFood
                        ? 'bg-amber-400'
                        : 'bg-white/70'
                  return <div key={`${point.x}-${point.y}`} className={`m-0.5 rounded-md ${cellClass}`} />
                })}
              </div>
            </div>

            <div className="flex flex-col justify-between gap-4">
              <div className="rounded-2xl bg-rice-100 p-4">
                <p className="text-sm font-bold text-charcoal-900">{t('snake.controls')}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <span />
                  <Button variant="outline" size="icon" onClick={() => changeDirection(DIRECTIONS.up)} aria-label={t('snake.up')}><ArrowUp size={18} /></Button>
                  <span />
                  <Button variant="outline" size="icon" onClick={() => changeDirection(DIRECTIONS.left)} aria-label={t('snake.left')}><ArrowLeft size={18} /></Button>
                  <Button variant="outline" size="icon" onClick={() => changeDirection(DIRECTIONS.down)} aria-label={t('snake.down')}><ArrowDown size={18} /></Button>
                  <Button variant="outline" size="icon" onClick={() => changeDirection(DIRECTIONS.right)} aria-label={t('snake.right')}><ArrowRight size={18} /></Button>
                </div>
              </div>

              <div className="grid gap-3">
                {game.status === 'playing' ? (
                  <Button onClick={finishGame}>{t('snake.end_game')}</Button>
                ) : (
                  <Button onClick={startGame}>{game.status === 'gameover' ? t('snake.play_again') : t('snake.start')}</Button>
                )}
                <Button variant="outline" onClick={resetGame}>
                  <RotateCcw size={17} />{t('snake.reset')}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-3xl border border-white/80 bg-white/90 p-4 shadow-float backdrop-blur sm:p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-amber-100 p-3 text-amber-500"><Trophy /></span>
            <div>
              <p className="text-sm font-bold tracking-widest text-chili-500">{t('snake.leaderboard_badge')}</p>
              <h2 className="text-2xl font-extrabold text-charcoal-900">{t('snake.leaderboard_title')}</h2>
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-charcoal-900/10 bg-rice-100 p-5 text-center text-sm leading-6 text-charcoal-500">
              {t('snake.empty_leaderboard')}
            </div>
          ) : (
            <ol className="mt-6 space-y-3">
              {leaderboard.map((record, index) => (
                <li key={record.id} data-created-at={record.createdAt} data-score={record.score} data-testid="leaderboard-row" className="flex items-center gap-3 rounded-2xl bg-rice-100 p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-chili-500">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-lg font-extrabold text-charcoal-900">{record.score}</p>
                    <p className="truncate text-xs text-charcoal-500">{new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(record.createdAt))}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </main>
  )
}
