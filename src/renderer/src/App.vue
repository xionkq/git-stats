<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { GitRepository, RepositoryAnalysis, ScanResult, ProgressInfo } from '@types'
import RepositoryList from './components/RepositoryList.vue'
import RepositoryDetail from './components/RepositoryDetail.vue'
import ProgressBar from './components/ProgressBar.vue'

const selectedDirectory = ref<string>('')
const repositories = ref<GitRepository[]>([])
const selectedRepository = ref<GitRepository | null>(null)
const repositoryAnalysis = ref<RepositoryAnalysis | null>(null)
const isScanning = ref(false)
const progress = ref<ProgressInfo | null>(null)
const progressCallback = ref<(() => void) | null>(null)

const selectDirectory = async (): Promise<void> => {
  const path = await window.gitStats.selectDirectory()
  if (path) {
    selectedDirectory.value = path
    await scanRepositories()
  }
}

const scanRepositories = async (): Promise<void> => {
  if (!selectedDirectory.value) return

  isScanning.value = true
  try {
    console.log('开始扫描目录:', selectedDirectory.value)
    const result: ScanResult = await window.gitStats.scanRepositories(selectedDirectory.value)
    console.log('扫描结果:', result)
    repositories.value = result.repositories
    console.log('设置仓库列表:', repositories.value.length, '个仓库')
  } catch (error) {
    console.error('扫描失败:', error)
  } finally {
    isScanning.value = false
  }
}

const selectRepository = async (repo: GitRepository): Promise<void> => {
  selectedRepository.value = repo
  repositoryAnalysis.value = null

  try {
    const analysis = await window.gitStats.analyzeRepository(JSON.parse(JSON.stringify(repo)))
    console.log('分析结果:', analysis)
    repositoryAnalysis.value = analysis
  } catch (error) {
    console.error('分析仓库失败:', error)
  }
}

const backToList = (): void => {
  selectedRepository.value = null
  repositoryAnalysis.value = null
}

onMounted(() => {
  progressCallback.value = window.gitStats.onProgress((progressInfo: ProgressInfo) => {
    progress.value = progressInfo
  })
})

onUnmounted(() => {
  if (progressCallback.value) {
    progressCallback.value()
  }
})
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>📄 Git 多仓库可视化分析工具</h1>
      <div class="header-actions">
        <button :disabled="isScanning" class="btn-primary" @click="selectDirectory">
          {{ isScanning ? '扫描中...' : '选择目录' }}
        </button>
        <div v-if="selectedDirectory" class="selected-path">当前目录: {{ selectedDirectory }}</div>
      </div>
    </header>

    <ProgressBar v-if="progress" :progress="progress" />

    <main class="main">
      <RepositoryList
        v-if="!selectedRepository"
        :repositories="repositories"
        :is-scanning="isScanning"
        @select-repository="selectRepository"
      />
      <RepositoryDetail
        v-else
        :repository="selectedRepository"
        :analysis="repositoryAnalysis"
        @back="backToList"
      />
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  background-color: #f6f8fa;
  color: #24292f;
  line-height: 1.5;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: white;
  border-bottom: 1px solid #d1d9e0;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header h1 {
  font-size: 20px;
  font-weight: 600;
  color: #24292f;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-primary {
  background: #007acc;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-primary:disabled {
  background: #8c959f;
  cursor: not-allowed;
}

.selected-path {
  font-size: 14px;
  color: #656d76;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.main {
  flex: 1;
  overflow: auto;
}
</style>
