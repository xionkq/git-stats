<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import {
  GitRepository,
  RepositoryAnalysis,
  ScanResult,
  ProgressInfo,
  ContributorStats
} from '@types'
import RepositoryList from './components/RepositoryList.vue'
import RepositoryDetail from './components/RepositoryDetail.vue'
import ContributorStatsView from './components/ContributorStats.vue'
import ProgressBar from './components/ProgressBar.vue'

const selectedDirectory = ref<string>('')
const branchName = ref<string>('') // 分支名称，为空则使用当前分支
const repositories = ref<GitRepository[]>([])
const selectedRepository = ref<GitRepository | null>(null)
const repositoryAnalysis = ref<RepositoryAnalysis | null>(null)
const isScanning = ref(false)
const progress = ref<ProgressInfo | null>(null)
const progressCallback = ref<(() => void) | null>(null)

// 页面状态：'list' | 'detail' | 'contributor'
const currentView = ref<'list' | 'detail' | 'contributor'>('list')
const selectedRepos = ref<GitRepository[]>([])
const accountName = ref<string>('')
const contributorStats = ref<ContributorStats | null>(null)
const comparisonYear1 = ref<number | undefined>(undefined)
const comparisonYear2 = ref<number | undefined>(undefined)

const repositoryListRef = ref<InstanceType<typeof RepositoryList> | null>(null)
const selectAllCheckboxRef = ref<HTMLInputElement | null>(null)

const validRepositoriesCount = computed(() => {
  return repositories.value.filter((repo) => repo.isValid).length
})

const isAllSelected = computed(() => {
  if (!repositoryListRef.value || validRepositoriesCount.value === 0) return false
  return repositoryListRef.value.getIsAllSelected()
})

const isIndeterminate = computed(() => {
  if (!repositoryListRef.value || validRepositoriesCount.value === 0) return false
  return repositoryListRef.value.getIsIndeterminate()
})

const handleSelectAll = (event: Event): void => {
  const target = event.target as HTMLInputElement
  if (!repositoryListRef.value) return

  if (target.checked) {
    repositoryListRef.value.selectAll()
  } else {
    repositoryListRef.value.unselectAll()
  }
}

// 监听选中状态变化，更新全选复选框状态
watch(
  [selectedRepos, repositories, isIndeterminate],
  () => {
    nextTick(() => {
      if (selectAllCheckboxRef.value) {
        selectAllCheckboxRef.value.indeterminate = isIndeterminate.value
      }
    })
  },
  { deep: true }
)

onMounted(() => {
  nextTick(() => {
    if (selectAllCheckboxRef.value) {
      selectAllCheckboxRef.value.indeterminate = isIndeterminate.value
    }
  })
})

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
    console.log('指定分支:', branchName.value.trim() || '使用当前分支')
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
  currentView.value = 'detail'

  try {
    const analysis = await window.gitStats.analyzeRepository(
      JSON.parse(JSON.stringify(repo)),
      branchName.value.trim() || undefined
    )
    console.log('分析结果:', analysis)
    repositoryAnalysis.value = analysis
  } catch (error) {
    console.error('分析仓库失败:', error)
  }
}

const backToList = (): void => {
  selectedRepository.value = null
  repositoryAnalysis.value = null
  currentView.value = 'list'
}

const handleSelectionChange = (repos: GitRepository[]): void => {
  selectedRepos.value = repos
}

const analyzeContributor = async (): Promise<void> => {
  if (!accountName.value.trim()) {
    alert('请输入账号名称')
    return
  }

  if (selectedRepos.value.length === 0) {
    alert('请至少选择一个仓库')
    return
  }

  currentView.value = 'contributor'
  contributorStats.value = null

  try {
    isScanning.value = true
    const currentYear = new Date().getFullYear()
    const year1 = comparisonYear1.value ?? currentYear - 1
    const year2 = comparisonYear2.value ?? currentYear
    const stats = await window.gitStats.analyzeContributor(
      accountName.value.trim(),
      JSON.parse(JSON.stringify(selectedRepos.value)),
      year1,
      year2,
      branchName.value.trim() || undefined
    )
    console.log('贡献统计结果:', stats)
    contributorStats.value = stats
  } catch (error) {
    console.error('统计贡献失败:', error)
    alert('统计贡献失败，请重试')
    currentView.value = 'list'
  } finally {
    isScanning.value = false
  }
}

const handleYearChange = async (year1: number, year2: number): Promise<void> => {
  comparisonYear1.value = year1
  comparisonYear2.value = year2

  if (!accountName.value.trim() || selectedRepos.value.length === 0) {
    return
  }

  try {
    isScanning.value = true
    const stats = await window.gitStats.analyzeContributor(
      accountName.value.trim(),
      JSON.parse(JSON.stringify(selectedRepos.value)),
      year1,
      year2,
      branchName.value.trim() || undefined
    )
    console.log('贡献统计结果:', stats)
    contributorStats.value = stats
  } catch (error) {
    console.error('统计贡献失败:', error)
    alert('统计贡献失败，请重试')
  } finally {
    isScanning.value = false
  }
}

const backToContributorList = (): void => {
  currentView.value = 'list'
  contributorStats.value = null
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
        <div class="branch-input-group">
          <input
            v-model="branchName"
            type="text"
            placeholder="分支名（留空使用当前分支）"
            class="branch-input"
            :disabled="isScanning"
          />
        </div>
        <button :disabled="isScanning" class="btn-primary" @click="selectDirectory">
          {{ isScanning ? '扫描中...' : '选择目录' }}
        </button>
        <div v-if="selectedDirectory" class="selected-path">当前目录: {{ selectedDirectory }}</div>
      </div>
    </header>

    <ProgressBar v-if="progress && isScanning" :progress="progress" />

    <main class="main">
      <RepositoryList
        v-if="currentView === 'list'"
        ref="repositoryListRef"
        :repositories="repositories"
        :is-scanning="isScanning"
        @select-repository="selectRepository"
        @selection-change="handleSelectionChange"
      />
      <RepositoryDetail
        v-else-if="currentView === 'detail'"
        :repository="selectedRepository"
        :analysis="repositoryAnalysis"
        @back="backToList"
      />
      <ContributorStatsView
        v-else-if="currentView === 'contributor'"
        :stats="contributorStats"
        :account="accountName"
        @back="backToContributorList"
        @year-change="handleYearChange"
      />
    </main>

    <footer v-if="currentView === 'list' && repositories.length > 0" class="footer">
      <div class="footer-content">
        <div class="footer-left">
          <label v-if="validRepositoriesCount > 0" class="select-all-label">
            <input
              ref="selectAllCheckboxRef"
              type="checkbox"
              :checked="isAllSelected"
              class="select-all-checkbox"
              @change="handleSelectAll"
            />
            <span class="select-all-text">全选</span>
          </label>
          <div class="selected-count">已选择: {{ selectedRepos.length }} 个仓库</div>
        </div>
        <div class="footer-input-group">
          <input
            v-model="accountName"
            type="text"
            placeholder="请输入账号名称"
            class="account-input"
            @keyup.enter="analyzeContributor"
          />
          <button
            class="btn-primary"
            :disabled="isScanning || selectedRepos.length === 0 || !accountName.trim()"
            @click="analyzeContributor"
          >
            {{ isScanning ? '统计中...' : '统计贡献' }}
          </button>
        </div>
      </div>
    </footer>
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

.branch-input-group {
  display: flex;
  align-items: center;
}

.branch-input {
  padding: 8px 12px;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  font-size: 14px;
  color: #24292f;
  outline: none;
  transition: border-color 0.2s;
  width: 200px;
}

.branch-input:focus {
  border-color: #007acc;
}

.branch-input:disabled {
  background-color: #f6f8fa;
  cursor: not-allowed;
}

.branch-input::placeholder {
  color: #8c959f;
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
  padding-bottom: 80px;
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #d1d9e0;
  padding: 16px 20px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  gap: 16px;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.select-all-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #007acc;
}

.select-all-text {
  font-size: 14px;
  font-weight: 500;
  color: #24292f;
}

.selected-count {
  font-size: 14px;
  color: #656d76;
  min-width: 120px;
}

.footer-input-group {
  display: flex;
  gap: 12px;
  align-items: center;
  flex: 1;
  max-width: 500px;
}

.account-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  font-size: 14px;
  color: #24292f;
  outline: none;
  transition: border-color 0.2s;
}

.account-input:focus {
  border-color: #007acc;
}

.account-input::placeholder {
  color: #8c959f;
}
</style>
