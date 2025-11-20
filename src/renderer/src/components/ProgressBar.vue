<template>
  <div class="progress-bar">
    <div class="progress-info">
      <span class="message">{{ progress.message }}</span>
      <span class="percentage">{{ Math.round((progress.current / progress.total) * 100) }}%</span>
    </div>
    <div class="progress-track">
      <div
        class="progress-fill"
        :style="{ width: `${(progress.current / progress.total) * 100}%` }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ProgressInfo } from '@types'

interface Props {
  progress: ProgressInfo
}

defineProps<Props>()
</script>

<style scoped>
.progress-bar {
  position: fixed;
  top: 60px;
  left: 20px;
  right: 20px;
  z-index: 1000;
  background: white;
  border: 1px solid #d1d9e0;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.message {
  color: #24292f;
}

.percentage {
  color: #007acc;
  font-weight: 500;
}

.progress-track {
  width: 100%;
  height: 4px;
  background: #f6f8fa;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007acc, #0056b3);
  border-radius: 2px;
  transition: width 0.3s ease;
}
</style>
