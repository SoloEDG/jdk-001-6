export type CanvasSize = 16 | 32 | 64

export type Pixel = string | null

export type ToolType = 'brush' | 'eraser' | 'bucket' | 'eyedropper' | 'line'

/**
 * 对称绘制模式：
 * - off：关闭
 * - horizontal：水平镜像（沿竖直对称轴，左右翻转）
 * - vertical：垂直镜像（沿水平对称轴，上下翻转）
 * - quad：四向（两条对称轴，同时左右、上下翻转）
 */
export type SymmetryMode = 'off' | 'horizontal' | 'vertical' | 'quad'

export interface Layer {
  id: string
  name: string
  visible: boolean
  pixels: Pixel[]
}

export interface Frame {
  id: string
  name: string
  layers: Layer[]
}

export interface PixelProject {
  id: string
  name: string
  canvasSize: CanvasSize
  frames: Frame[]
  activeFrameIndex: number
  activeLayerIndex: number
  frameDelayMs: number
  recentColors: string[]
  customColors: string[]
  updatedAt: number
}

export interface EditorPreferences {
  activeColor: string
  activeTool: ToolType
  activeProjectId: string | null
  symmetryMode: SymmetryMode
}
