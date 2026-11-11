import { reactive } from 'vue'
import type { Layer } from '../core/types'

/**
 * 撤销历史。
 *
 * 每次落笔（含对称模式下连带写入的镜像像素）、油漆桶、直线完成都作为一个
 * 不可分割的编辑单元，提交一次图层快照；撤销时整组回退，镜像像素一起还原。
 * 历史按帧独立保存，切换帧或项目后不再影响另一帧的记录。
 */

export interface LayerSnapshot {
  id: string
  name: string
  visible: boolean
  pixels: (string | null)[]
}

interface FrameHistory {
  undoStack: LayerSnapshot[][]
  redoStack: LayerSnapshot[][]
}

const MAX_HISTORY = 50

const histories = new Map<string, FrameHistory>()

/** 供 UI 响应历史栈变化的响应式版本号。 */
export const historyVersion = reactive({ value: 0 })

function keyOf(projectId: string, frameId: string): string {
  return `${projectId}::${frameId}`
}

function ensureHistory(projectId: string, frameId: string): FrameHistory {
  const key = keyOf(projectId, frameId)
  let history = histories.get(key)
  if (!history) {
    history = { undoStack: [], redoStack: [] }
    histories.set(key, history)
  }
  return history
}

function snapshotLayers(layers: Layer[]): LayerSnapshot[] {
  return layers.map((layer) => ({
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    pixels: layer.pixels.slice(),
  }))
}

/** 编辑前提交当前图层状态；新编辑会清空该帧的重做栈。 */
export function pushUndoSnapshot(
  projectId: string,
  frameId: string,
  layers: Layer[],
): void {
  const history = ensureHistory(projectId, frameId)
  history.undoStack.push(snapshotLayers(layers))
  if (history.undoStack.length > MAX_HISTORY) {
    history.undoStack.shift()
  }
  history.redoStack = []
  historyVersion.value += 1
}

export function canUndo(projectId: string, frameId: string): boolean {
  return ensureHistory(projectId, frameId).undoStack.length > 0
}

export function canRedo(projectId: string, frameId: string): boolean {
  return ensureHistory(projectId, frameId).redoStack.length > 0
}

function restoreLayers(layers: Layer[], snapshots: LayerSnapshot[]): Layer[] {
  // 以当前图层结构为基准，按 id 找回快照，兼容图层增删后的撤销场景
  return layers.map((layer) => {
    const snapshot = snapshots.find((item) => item.id === layer.id)
    return snapshot ? { ...layer, pixels: snapshot.pixels.slice() } : layer
  })
}

/** 撤销：返回回退后的图层；无历史时返回 null。 */
export function undo(
  projectId: string,
  frameId: string,
  currentLayers: Layer[],
): Layer[] | null {
  const history = ensureHistory(projectId, frameId)
  const snapshot = history.undoStack.pop()
  if (!snapshot) return null
  history.redoStack.push(snapshotLayers(currentLayers))
  historyVersion.value += 1
  return restoreLayers(currentLayers, snapshot)
}

/** 重做：返回重做后的图层；无记录时返回 null。 */
export function redo(
  projectId: string,
  frameId: string,
  currentLayers: Layer[],
): Layer[] | null {
  const history = ensureHistory(projectId, frameId)
  const snapshot = history.redoStack.pop()
  if (!snapshot) return null
  history.undoStack.push(snapshotLayers(currentLayers))
  historyVersion.value += 1
  return restoreLayers(currentLayers, snapshot)
}

/** 清空某一帧的历史（删除帧时调用）。 */
export function clearFrameHistory(projectId: string, frameId: string): void {
  histories.delete(keyOf(projectId, frameId))
  historyVersion.value += 1
}

/** 清空整个项目的历史（删除项目时调用）。 */
export function clearProjectHistory(projectId: string): void {
  const prefix = `${projectId}::`
  for (const key of histories.keys()) {
    if (key.startsWith(prefix)) histories.delete(key)
  }
  historyVersion.value += 1
}
