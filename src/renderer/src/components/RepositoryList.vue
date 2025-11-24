<template>
  <div class="repository-list">
    <div class="list-header">
      <h2>Git 仓库列表</h2>
      <div class="stats">
        <span>总计: {{ repositories.length }}</span>
        <span>有效: {{ validRepositories.length }}</span>
      </div>
    </div>

    <div v-if="isScanning" class="loading">
      <div class="spinner"></div>
      <p>正在扫描仓库...</p>
    </div>

    <div v-else-if="repositories.length === 0" class="empty-state">
      <p>请先选择包含Git仓库的目录</p>
    </div>

    <div v-else class="repositories">
      <div
        v-for="repo in repositories"
        :key="repo.path"
        class="repository-card"
        :class="{ invalid: !repo.isValid, selected: isSelected(repo) }"
        @click="handleCardClick(repo)"
      >
        <div class="card-header">
          <div class="card-header-left">
            <input
              v-if="repo.isValid"
              type="checkbox"
              :checked="isSelected(repo)"
              class="repo-checkbox"
              @click.stop="handleCheckboxClick(repo)"
            />
            <h3>{{ repo.name }}</h3>
          </div>
          <span class="status" :class="{ valid: repo.isValid, invalid: !repo.isValid }">
            {{ repo.isValid ? '有效' : '无效' }}
          </span>
        </div>

        <div class="card-content">
          <p class="path">{{ repo.path }}</p>

          <div v-if="repo.isValid" class="repo-info">
            <div class="info-item">
              <span class="label">分支:</span>
              <span class="value">{{ repo.currentBranch }}</span>
            </div>
            <div class="info-item">
              <span class="label">提交数:</span>
              <span class="value">{{ repo.totalCommits }}</span>
            </div>
            <div class="info-item">
              <span class="label">作者数:</span>
              <span class="value">{{ repo.authors.length }}</span>
            </div>
            <div class="info-item">
              <span class="label">最新提交:</span>
              <span class="value">{{ repo.latestCommitDate }}</span>
            </div>
          </div>

          <div v-else class="error-info">
            <p>{{ repo.error }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { GitRepository } from '@types'

interface Props {
  repositories: GitRepository[]
  isScanning: boolean
}

const props = defineProps<Props>()

const selectedRepos = ref<Set<string>>(new Set())

const emit = defineEmits<{
  selectRepository: [repo: GitRepository]
  selectionChange: [repos: GitRepository[]]
}>()

const validRepositories = computed(() => props.repositories.filter((repo) => repo.isValid))

const selectedValidCount = computed(() => {
  return validRepositories.value.filter((repo) => selectedRepos.value.has(repo.path)).length
})

const isAllSelected = computed(() => {
  return (
    validRepositories.value.length > 0 &&
    selectedValidCount.value === validRepositories.value.length
  )
})

const isIndeterminate = computed(() => {
  return selectedValidCount.value > 0 && selectedValidCount.value < validRepositories.value.length
})

const isSelected = (repo: GitRepository): boolean => {
  return selectedRepos.value.has(repo.path)
}

// const handleSelectAll = (event: Event): void => {
//   const target = event.target as HTMLInputElement
//   if (target.checked) {
//     // 全选所有有效仓库
//     validRepositories.value.forEach((repo) => {
//       selectedRepos.value.add(repo.path)
//     })
//   } else {
//     // 取消全选
//     validRepositories.value.forEach((repo) => {
//       selectedRepos.value.delete(repo.path)
//     })
//   }
//   emitSelectionChange()
// }

const handleCheckboxClick = (repo: GitRepository): void => {
  if (!repo.isValid) return

  if (selectedRepos.value.has(repo.path)) {
    selectedRepos.value.delete(repo.path)
  } else {
    selectedRepos.value.add(repo.path)
  }

  emitSelectionChange()
}

const handleCardClick = (repo: GitRepository): void => {
  if (!repo.isValid) return

  // 点击卡片其他区域进入详情页（checkbox的点击事件已经通过@click.stop阻止冒泡）
  emit('selectRepository', repo)
}

const emitSelectionChange = (): void => {
  const selected = props.repositories.filter((repo) => selectedRepos.value.has(repo.path))
  emit('selectionChange', selected)
}

// 暴露方法供父组件调用
defineExpose({
  getSelectedRepos: () => {
    return props.repositories.filter((repo) => selectedRepos.value.has(repo.path))
  },
  clearSelection: () => {
    selectedRepos.value.clear()
    emitSelectionChange()
  },
  selectAll: () => {
    validRepositories.value.forEach((repo) => {
      selectedRepos.value.add(repo.path)
    })
    emitSelectionChange()
  },
  unselectAll: () => {
    validRepositories.value.forEach((repo) => {
      selectedRepos.value.delete(repo.path)
    })
    emitSelectionChange()
  },
  getIsAllSelected: () => isAllSelected.value,
  getIsIndeterminate: () => isIndeterminate.value,
  getValidRepositoriesCount: () => validRepositories.value.length
})
</script>

<style scoped>
.repository-list {
  padding: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list-header h2 {
  margin: 0;
  color: #333;
}

.stats {
  display: flex;
  gap: 15px;
  color: #666;
  font-size: 14px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007acc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.repositories {
  display: grid;
  gap: 16px;
}

.repository-card {
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.repository-card:hover {
  border-color: #007acc;
  box-shadow: 0 2px 8px rgba(0, 122, 204, 0.1);
}

.repository-card.selected {
  border-color: #007acc;
  background-color: #f0f7ff;
  box-shadow: 0 2px 8px rgba(0, 122, 204, 0.15);
}

.repository-card.invalid {
  opacity: 0.7;
  cursor: not-allowed;
}

.repository-card.invalid:hover {
  border-color: #e1e4e8;
  box-shadow: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.repo-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #007acc;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status.valid {
  background-color: #28a745;
  color: white;
}

.status.invalid {
  background-color: #dc3545;
  color: white;
}

.path {
  color: #666;
  font-size: 14px;
  margin-bottom: 12px;
  word-break: break-all;
}

.repo-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.info-item {
  display: flex;
  font-size: 14px;
}

.label {
  color: #666;
  margin-right: 8px;
}

.value {
  color: #333;
  font-weight: 500;
}

.error-info {
  color: #dc3545;
  font-size: 14px;
}
</style>
