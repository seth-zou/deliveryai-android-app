import { test, expect } from '@playwright/test'

const STORAGE_KEY = 'snake-leaderboard'

test.describe('贪食蛇排行榜 - 本地持久化', () => {
  test('SNAKE-001: 首次进入展示空排行榜', async ({ page }) => {
    await page.goto('/#/snake')
    await expect(page).toHaveURL(/#\/snake$/)
    await expect(page.getByRole('heading', { name: '贪食蛇挑战' })).toBeVisible()
    await expect(page.getByText('暂无历史得分')).toBeVisible()
  })

  test('SNAKE-002: 一次有效游戏结束后记录分数，刷新后仍可读取', async ({ page }) => {
    await page.goto('/#/snake')
    await page.getByRole('button', { name: '开始游戏' }).click()
    await expect(page.getByTestId('snake-score')).toHaveText('10')
    await page.getByRole('button', { name: '结束本局' }).click()
    await expect(page.getByTestId('leaderboard-row').first()).toContainText('10')

    await page.reload()
    await expect(page.getByTestId('leaderboard-row').first()).toContainText('10')
  })

  test('SNAKE-003: 排行榜按高分排序、同分最近优先，并截断到 10 条', async ({ page }) => {
    await page.goto('/#/snake')
    await page.evaluate((key) => {
      const records = [
        { id: 'low', score: 10, createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'same-old', score: 40, createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'same-new', score: 40, createdAt: '2026-02-01T00:00:00.000Z' },
        { id: 'top', score: 90, createdAt: '2026-01-03T00:00:00.000Z' },
        { id: 'fifth', score: 30, createdAt: '2026-01-04T00:00:00.000Z' },
        { id: 'sixth', score: 25, createdAt: '2026-01-05T00:00:00.000Z' },
        { id: 'seventh', score: 20, createdAt: '2026-01-06T00:00:00.000Z' },
        { id: 'eighth', score: 15, createdAt: '2026-01-07T00:00:00.000Z' },
        { id: 'ninth', score: 12, createdAt: '2026-01-08T00:00:00.000Z' },
        { id: 'tenth', score: 11, createdAt: '2026-01-09T00:00:00.000Z' },
        { id: 'drop', score: 1, createdAt: '2026-01-10T00:00:00.000Z' },
      ]
      localStorage.setItem(key, JSON.stringify(records))
    }, STORAGE_KEY)
    await page.reload()

    const rows = page.getByTestId('leaderboard-row')
    await expect(rows).toHaveCount(10)
    await expect(rows.nth(0)).toHaveAttribute('data-score', '90')
    await expect(rows.nth(1)).toHaveAttribute('data-score', '40')
    await expect(rows.nth(1)).toHaveAttribute('data-created-at', '2026-02-01T00:00:00.000Z')
    await expect(rows.nth(2)).toHaveAttribute('data-score', '40')
    await expect(rows.nth(2)).toHaveAttribute('data-created-at', '2026-01-01T00:00:00.000Z')
    await expect(rows.nth(8)).toHaveAttribute('data-score', '11')
    await expect(rows.nth(9)).toHaveAttribute('data-score', '10')
    const scores = await rows.evaluateAll((items) => items.map((item) => item.getAttribute('data-score')))
    expect(scores).not.toContain('1')
  })

  test('SNAKE-004: 损坏或无效旧数据降级为空态', async ({ page }) => {
    await page.goto('/#/snake')
    await page.evaluate((key) => localStorage.setItem(key, '{bad json'), STORAGE_KEY)
    await page.reload()
    await expect(page.getByText('暂无历史得分')).toBeVisible()

    await page.evaluate((key) => {
      localStorage.setItem(key, JSON.stringify([{ id: 'bad-score', score: -3, createdAt: 'nope' }]))
    }, STORAGE_KEY)
    await page.reload()
    await expect(page.getByText('暂无历史得分')).toBeVisible()
  })
})
