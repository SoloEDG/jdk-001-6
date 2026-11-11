import {
  compositeLayers,
  drawLine,
  floodFill,
  getPixel,
} from '../core/pixelGrid'
import {
  floodFillSymmetric,
  paintSymmetric,
} from '../core/symmetry'
import type { Layer, Pixel, SymmetryMode, ToolType } from '../core/types'

export interface LinePending {
  x: number
  y: number
}

export interface ToolContext {
  size: number
  layers: Layer[]
  activeLayerIndex: number
  activeColor: string
  tool: ToolType
  linePending: LinePending | null
  symmetryMode: SymmetryMode
}

export interface ToolResult {
  layers: Layer[]
  activeColor?: string
  linePending: LinePending | null
  consumed: boolean
}

function updateActiveLayer(ctx: ToolContext, mutate: (pixels: Pixel[]) => Pixel[]): Layer[] {
  const layers = ctx.layers.map((l, i) =>
    i === ctx.activeLayerIndex ? { ...l, pixels: mutate(l.pixels) } : l,
  )
  return layers
}

/** 直线在对称模式下逐格镜像写入，保证每个落点与其镜像格同色。 */
function drawSymmetricLine(
  pixels: Pixel[],
  size: number,
  mode: SymmetryMode,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: Pixel,
): Pixel[] {
  if (mode === 'off') {
    return drawLine(pixels, size, x0, y0, x1, y1, color)
  }
  let next = pixels
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy
  let x = x0
  let y = y0

  while (true) {
    next = paintSymmetric(next, x, y, size, mode, color)
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }
  return next
}

export function applyToolAt(ctx: ToolContext, x: number, y: number): ToolResult {
  const { tool, activeColor, size, linePending, symmetryMode } = ctx
  let layers = ctx.layers
  let color = activeColor
  let pending = linePending

  if (tool === 'eyedropper') {
    const composite = compositeLayers(ctx.layers, size)
    const picked = getPixel(composite, x, y, size)
    if (picked) color = picked
    return { layers, activeColor: color, linePending: null, consumed: true }
  }

  if (tool === 'line') {
    if (!pending) {
      pending = { x, y }
      return { layers, linePending: pending, consumed: true }
    }
    const colorForLine = activeColor
    layers = updateActiveLayer(ctx, (pixels) =>
      drawSymmetricLine(
        pixels,
        size,
        symmetryMode,
        pending!.x,
        pending!.y,
        x,
        y,
        colorForLine,
      ),
    )
    pending = null
    return { layers, linePending: pending, consumed: true }
  }

  if (tool === 'brush') {
    layers = updateActiveLayer(ctx, (pixels) =>
      paintSymmetric(pixels, x, y, size, symmetryMode, activeColor),
    )
    return { layers, linePending: null, consumed: true }
  }

  if (tool === 'eraser') {
    layers = updateActiveLayer(ctx, (pixels) =>
      paintSymmetric(pixels, x, y, size, symmetryMode, null),
    )
    return { layers, linePending: null, consumed: true }
  }

  if (tool === 'bucket') {
    layers = updateActiveLayer(ctx, (pixels) =>
      symmetryMode === 'off'
        ? floodFill(pixels, size, x, y, activeColor)
        : floodFillSymmetric(pixels, size, x, y, activeColor, symmetryMode),
    )
    return { layers, linePending: null, consumed: true }
  }

  return { layers, linePending: pending, consumed: false }
}

export function cancelLineTool(): LinePending | null {
  return null
}
