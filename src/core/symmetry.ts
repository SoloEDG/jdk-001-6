import { colorsMatch, indexFor, inBounds } from './pixelGrid'
import type { Pixel, SymmetryMode } from './types'

/**
 * 对称绘制核心。
 *
 * 对称轴规则（边长 size），镜像坐标统一为 size - 1 - 原坐标：
 * - size 为偶数：对称轴落在格缝上（如 16 宽时轴在 7、8 两格之间，0↔15、7↔8）
 * - size 为奇数：对称轴穿过中间那一格（如 15 宽时中格 7 自镜像）
 *
 * 点击落点本就是整数格坐标，公式对奇偶两种边长一致，无需额外取整分支。
 */

/** 沿竖直对称轴左右翻转后的 x 坐标。 */
export function mirrorX(x: number, size: number): number {
  return size - 1 - x
}

/** 沿水平对称轴上下翻转后的 y 坐标。 */
export function mirrorY(y: number, size: number): number {
  return size - 1 - y
}

export interface SymmetryPoint {
  x: number
  y: number
}

/**
 * 返回某落笔点在当前对称模式下需要写入的全部格点（含原点），已去重并过滤越界点。
 * 中格自镜像时只出现一次，避免重复写入。
 */
export function symmetricPoints(
  x: number,
  y: number,
  size: number,
  mode: SymmetryMode,
): SymmetryPoint[] {
  if (mode === 'off') {
    return inBounds(x, y, size) ? [{ x, y }] : []
  }

  const xs = mode === 'horizontal' || mode === 'quad' ? [x, mirrorX(x, size)] : [x]
  const ys = mode === 'vertical' || mode === 'quad' ? [y, mirrorY(y, size)] : [y]

  const seen = new Set<number>()
  const points: SymmetryPoint[] = []
  for (const px of xs) {
    for (const py of ys) {
      if (!inBounds(px, py, size)) continue
      const key = indexFor(px, py, size)
      if (seen.has(key)) continue
      seen.add(key)
      points.push({ x: px, y: py })
    }
  }
  return points
}

/**
 * 把一次落笔（含镜像格）真正写进图层像素，返回新数组。
 * 镜像像素与原落笔使用同一颜色，落笔即固化到图层；
 * 关闭对称后两边像素都会保留。
 */
export function paintSymmetric(
  pixels: Pixel[],
  x: number,
  y: number,
  size: number,
  mode: SymmetryMode,
  color: Pixel,
): Pixel[] {
  const points = symmetricPoints(x, y, size, mode)
  if (points.length === 0) return pixels
  const next = pixels.slice()
  for (const point of points) {
    next[indexFor(point.x, point.y, size)] = color
  }
  return next
}

/**
 * 对称模式下的油漆桶：只填充点击点所在一侧的连通区域。
 *
 * 与画笔/橡皮不同，油漆桶不做镜像回写——需求要求填充在对称轴处阻断，
 * 绝不跨轴灌满对侧，也不会覆盖对侧已有的像素。
 *
 * 半平面约束：泛洪只允许访问起点所在的闭半区
 * （偶数边长轴在格缝，两半区无共享格；奇数边长轴上中格同时属于两个半区，
 * 点击中格时归入起点侧半区）。quad 模式下两个半区约束同时生效，
 * 实际可填充范围即点击点所在象限。
 */
export function floodFillSymmetric(
  pixels: Pixel[],
  size: number,
  startX: number,
  startY: number,
  fillColor: Pixel,
  mode: SymmetryMode,
): Pixel[] {
  if (mode === 'off') return pixels

  const target = pixels[indexFor(startX, startY, size)] ?? null
  if (colorsMatch(target, fillColor)) return pixels

  // 水平镜像沿竖直轴翻转 → 约束 x；垂直镜像沿水平轴翻转 → 约束 y
  const blockVertical = mode === 'horizontal' || mode === 'quad'
  const blockHorizontal = mode === 'vertical' || mode === 'quad'
  // 偶数边长 mid 为 x.5（格缝），奇数边长 mid 为整数（中格）
  const mid = (size - 1) / 2
  const leftHalf = startX <= mid
  const topHalf = startY <= mid

  function allowed(nx: number, ny: number): boolean {
    if (blockVertical && (leftHalf ? nx > mid : nx < mid)) return false
    if (blockHorizontal && (topHalf ? ny > mid : ny < mid)) return false
    return true
  }

  const next = pixels.slice()
  const visited = new Set<number>()
  const stack: SymmetryPoint[] = [{ x: startX, y: startY }]

  while (stack.length > 0) {
    const current = stack.pop()!
    const idx = indexFor(current.x, current.y, size)
    if (visited.has(idx)) continue
    visited.add(idx)
    if (!colorsMatch(next[idx] ?? null, target)) continue

    next[idx] = fillColor

    const neighbors: SymmetryPoint[] = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ]
    for (const neighbor of neighbors) {
      if (!inBounds(neighbor.x, neighbor.y, size)) continue
      if (!allowed(neighbor.x, neighbor.y)) continue
      stack.push(neighbor)
    }
  }

  return next
}
