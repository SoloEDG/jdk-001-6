<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import FramePanel from './components/FramePanel.vue'
import LayerPanel from './components/LayerPanel.vue'
import PixelCanvas from './components/PixelCanvas.vue'
import ProjectPanel from './components/ProjectPanel.vue'
import ToolBar from './components/ToolBar.vue'
import { useEditorStore } from './editor/useEditorStore'

const store = useEditorStore()

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

function onKeydown(event: KeyboardEvent) {
  const mod = event.ctrlKey || event.metaKey
  if (!mod) return
  const key = event.key.toLowerCase()
  if (key !== 'z' && key !== 'y') return
  if (isEditableTarget(event.target)) return
  event.preventDefault()
  if (key === 'y' || (key === 'z' && event.shiftKey)) {
    store.redoLast()
  } else {
    store.undoLast()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="app-shell">
    <ToolBar />
    <PixelCanvas />
    <aside class="right-rail">
      <ProjectPanel />
      <LayerPanel />
      <FramePanel />
    </aside>
  </div>
</template>
