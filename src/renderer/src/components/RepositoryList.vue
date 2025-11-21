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
        :class="{ invalid: !repo.isValid }"
        @click="handleSelectRepository(repo)"
      >
        <div class="card-header">
          <h3>{{ repo.name }}</h3>
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
import { computed } from 'vue'
import { GitRepository } from '@types'

interface Props {
  repositories: GitRepository[]
  isScanning: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  selectRepository: [repo: GitRepository]
}>()

const validRepositories = computed(() => props.repositories.filter((repo) => repo.isValid))

const handleSelectRepository = (repo: GitRepository) => {
  if (repo.isValid) {
    emit('selectRepository', repo)
  }
}
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
