<script setup lang="ts">
import type { SymmetryMode } from '../core/types'
import { useEditorStore } from '../editor/useEditorStore'

const store = useEditorStore()

const modes: { id: SymmetryMode; label: string; hint: string }[] = [
  { id: 'off', label: '关闭', hint: '自由绘制' },
  { id: 'horizontal', label: '水平镜像', hint: '沿竖直中轴左右对称' },
  { id: 'vertical', label: '垂直镜像', hint: '沿水平中轴上下对称' },
  { id: 'quad', label: '四向', hint: '两条中轴，四个象限同时对称' },
]
</script>

<template>
  <section class="panel symmetry-panel">
    <h3>对称绘制</h3>
    <p class="hint">落笔即把镜像格写入同一图层，关闭后两侧像素都保留</p>
    <div class="symmetry-list">
      <button
        v-for="mode in modes"
        :key="mode.id"
        type="button"
        class="symmetry-btn"
        :class="{ active: store.prefs.symmetryMode === mode.id }"
        :title="mode.hint"
        @click="store.setSymmetryMode(mode.id)"
      >
        {{ mode.label }}
      </button>
    </div>
    <p v-if="store.prefs.symmetryMode !== 'off'" class="hint symmetry-note">
      油漆桶只填充本侧连通区域，不会跨轴灌到对侧
    </p>
  </section>
</template>
