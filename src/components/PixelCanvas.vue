<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../editor/useEditorStore'

const store = useEditorStore()

const displaySize = computed(() => {
  const size = store.canvasSize
  const cell = Math.floor(Math.min(512 / size, 24))
  return { size, cell, px: size * cell }
})

const symmetryMode = computed(() => store.prefs.symmetryMode)

// 偶数边长轴在格缝（像素边界），奇数边长轴穿过中格中心；两种情况公式一致
const verticalAxisStyle = computed(() => {
  const { size, cell } = displaySize.value
  const mid = (size - 1) / 2
  return { left: `${(mid + 0.5) * cell}px` }
})

const horizontalAxisStyle = computed(() => {
  const { size, cell } = displaySize.value
  const mid = (size - 1) / 2
  const top = (mid + 0.5) * cell
  return { top: `${top}px` }
})

const showVerticalAxis = computed(
  () => symmetryMode.value === 'horizontal' || symmetryMode.value === 'quad',
)
const showHorizontalAxis = computed(
  () => symmetryMode.value === 'vertical' || symmetryMode.value === 'quad',
)

function onCellClick(x: number, y: number) {
  if (store.isPlaying) return
  store.onCanvasPointer(x, y)
}

function cellStyle(index: number) {
  const color = store.compositePixels[index]
  const size = displaySize.value.size
  const x = index % size
  const y = Math.floor(index / size)
  const checker = (x + y) % 2 === 0 ? '#2a2d35' : '#24272e'
  if (color === null || color === undefined) {
    return { backgroundColor: checker }
  }
  return { backgroundColor: color }
}
</script>

<template>
  <main class="canvas-area">
    <div class="canvas-meta">
      <span>{{ store.canvasSize }}×{{ store.canvasSize }}</span>
      <span v-if="symmetryMode !== 'off'" class="badge symmetry-badge">
        对称：{{ symmetryMode === 'horizontal' ? '水平镜像' : symmetryMode === 'vertical' ? '垂直镜像' : '四向' }}
      </span>
      <span v-if="store.isPlaying" class="badge playing">动画预览中</span>
      <span v-else-if="store.previewFrameIndex !== null" class="badge">预览帧</span>
    </div>
    <div class="canvas-frame" :style="{ width: `${displaySize.px}px`, height: `${displaySize.px}px` }">
      <div
        class="pixel-grid"
        :style="{
          gridTemplateColumns: `repeat(${displaySize.size}, ${displaySize.cell}px)`,
          width: `${displaySize.px}px`,
          height: `${displaySize.px}px`,
        }"
      >
        <button
          v-for="(_, index) in store.compositePixels"
          :key="index"
          type="button"
          class="pixel-cell"
          :style="cellStyle(index)"
          :aria-label="`像素 ${index}`"
          @click="onCellClick(index % displaySize.size, Math.floor(index / displaySize.size))"
        />
      </div>
      <div
        v-if="showVerticalAxis"
        class="symmetry-axis axis-vertical"
        :style="verticalAxisStyle"
        aria-hidden="true"
      />
      <div
        v-if="showHorizontalAxis"
        class="symmetry-axis axis-horizontal"
        :style="horizontalAxisStyle"
        aria-hidden="true"
      />
    </div>
  </main>
</template>
