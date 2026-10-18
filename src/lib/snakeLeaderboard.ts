export const SNAKE_LEADERBOARD_KEY = 'snake-leaderboard'
export const SNAKE_LEADERBOARD_LIMIT = 10

export interface SnakeScoreRecord {
  id: string
  score: number
  createdAt: string
}

interface ScoreStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

function getStorage(): ScoreStorage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function normalizeScoreRecord(value: unknown, index: number): SnakeScoreRecord | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Partial<SnakeScoreRecord>
  const score = Number(record.score)
  const createdAt = typeof record.createdAt === 'string' ? record.createdAt : ''
  const createdAtMs = Date.parse(createdAt)
  if (!Number.isFinite(score) || score < 0 || !Number.isFinite(createdAtMs)) return null
  return {
    id: typeof record.id === 'string' && record.id ? record.id : `${createdAt}-${score}-${index}`,
    score: Math.floor(score),
    createdAt,
  }
}

export function sortSnakeLeaderboard(records: SnakeScoreRecord[]): SnakeScoreRecord[] {
  return [...records].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return Date.parse(b.createdAt) - Date.parse(a.createdAt)
  })
}

export function normalizeSnakeLeaderboard(value: unknown): SnakeScoreRecord[] {
  if (!Array.isArray(value)) return []
  return sortSnakeLeaderboard(value.map(normalizeScoreRecord).filter((record): record is SnakeScoreRecord => Boolean(record))).slice(0, SNAKE_LEADERBOARD_LIMIT)
}

export function loadSnakeLeaderboard(storage: ScoreStorage | null = getStorage()): SnakeScoreRecord[] {
  if (!storage) return []
  try {
    return normalizeSnakeLeaderboard(JSON.parse(storage.getItem(SNAKE_LEADERBOARD_KEY) ?? '[]'))
  } catch {
    return []
  }
}

export function saveSnakeScore(score: number, storage: ScoreStorage | null = getStorage(), now = new Date()): SnakeScoreRecord[] {
  const safeScore = Number.isFinite(score) && score > 0 ? Math.floor(score) : 0
  const record: SnakeScoreRecord = {
    id: `${now.toISOString()}-${safeScore}`,
    score: safeScore,
    createdAt: now.toISOString(),
  }
  const nextRecords = normalizeSnakeLeaderboard([record, ...loadSnakeLeaderboard(storage)])
  if (!storage) return nextRecords
  try {
    storage.setItem(SNAKE_LEADERBOARD_KEY, JSON.stringify(nextRecords))
  } catch {
    // localStorage 不可用时保留内存结果，页面仍能反馈本局成绩。
  }
  return nextRecords
}
