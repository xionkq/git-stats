<template>
  <div class="repository-detail">
    <div class="detail-header">
      <button @click="emit('back')" class="back-btn">
        ← 返回列表
      </button>
      <h2>{{ repository?.name }}</h2>
    </div>

    <div v-if="!analysis" class="loading">
      <div class="spinner"></div>
      <p>正在分析仓库...</p>
    </div>

    <div v-else class="detail-content">
      <div class="repo-overview">
        <div class="overview-card">
          <h3>仓库信息</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">路径:</span>
              <span class="value">{{ repository?.path }}</span>
            </div>
            <div class="info-item">
              <span class="label">分支:</span>
              <span class="value">{{ repository?.currentBranch }}</span>
            </div>
            <div class="info-item">
              <span class="label">总提交数:</span>
              <span class="value">{{ analysis.commits.length }}</span>
            </div>
            <div class="info-item">
              <span class="label">活跃作者:</span>
              <span class="value">{{ analysis.authorStats.length }}</span>
            </div>
            <div class="info-item">
              <span class="label">最新提交:</span>
              <span class="value">{{ repository?.latestCommitDate }}</span>
            </div>
            <div class="info-item">
              <span class="label">活跃天数:</span>
              <span class="value">{{ analysis.dailyStats.length }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="charts-section">
        <div class="chart-container">
          <h3>作者贡献分布</h3>
          <div ref="authorChartRef" class="chart"></div>
        </div>

        <div class="chart-container">
          <h3>每日提交趋势</h3>
          <div ref="dailyChartRef" class="chart"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import * as echarts from 'echarts'
import { GitRepository, RepositoryAnalysis } from '@types'

interface Props {
  repository: GitRepository | null
  analysis: RepositoryAnalysis | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  back: []
}>()

const authorChartRef = ref<HTMLDivElement>()
const dailyChartRef = ref<HTMLDivElement>()
let authorChart: echarts.ECharts | null = null
let dailyChart: echarts.ECharts | null = null

const createAuthorChart = () => {
  if (!authorChartRef.value || !props.analysis) return

  if (authorChart) {
    authorChart.dispose()
  }

  authorChart = echarts.init(authorChartRef.value)

  const data = props.analysis.authorStats.map(stat => ({
    name: stat.author,
    value: stat.commits
  }))

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '提交次数',
        type: 'pie',
        radius: '50%',
        data: data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }

  authorChart.setOption(option)
}

const createDailyChart = () => {
  if (!dailyChartRef.value || !props.analysis) return

  if (dailyChart) {
    dailyChart.dispose()
  }

  dailyChart = echarts.init(dailyChartRef.value)

  const data = props.analysis.dailyStats.map(stat => [stat.date, stat.commits])

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: props.analysis.dailyStats.map(stat => stat.date)
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '提交次数',
        type: 'line',
        data: data.map(item => item[1]),
        smooth: true,
        itemStyle: {
          color: '#007acc'
        }
      }
    ]
  }

  dailyChart.setOption(option)
}

const resizeCharts = () => {
  if (authorChart) {
    authorChart.resize()
  }
  if (dailyChart) {
    dailyChart.resize()
  }
}

watch(() => props.analysis, (newAnalysis) => {
  if (newAnalysis) {
    // 延迟创建图表，确保DOM已渲染
    setTimeout(() => {
      createAuthorChart()
      createDailyChart()
    }, 100)
  }
}, { immediate: true })

onMounted(() => {
  window.addEventListener('resize', resizeCharts)
})

// 清理图表实例
const cleanup = () => {
  if (authorChart) {
    authorChart.dispose()
    authorChart = null
  }
  if (dailyChart) {
    dailyChart.dispose()
    dailyChart = null
  }
  window.removeEventListener('resize', resizeCharts)
}

// 在组件卸载时清理
import { onUnmounted } from 'vue'
onUnmounted(cleanup)
</script>

<style scoped>
.repository-detail {
  padding: 20px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.back-btn {
  padding: 8px 16px;
  background: #f6f8fa;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #24292f;
}

.back-btn:hover {
  background: #f3f4f6;
}

.detail-header h2 {
  margin: 0;
  color: #24292f;
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
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.repo-overview {
  background: white;
  border: 1px solid #d1d9e0;
  border-radius: 8px;
  padding: 20px;
}

.overview-card h3 {
  margin: 0 0 16px 0;
  color: #24292f;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  font-size: 14px;
}

.label {
  color: #656d76;
  margin-right: 8px;
  min-width: 80px;
}

.value {
  color: #24292f;
  font-weight: 500;
  word-break: break-all;
}

.charts-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.chart-container {
  background: white;
  border: 1px solid #d1d9e0;
  border-radius: 8px;
  padding: 20px;
}

.chart-container h3 {
  margin: 0 0 16px 0;
  color: #24292f;
}

.chart {
  width: 100%;
  height: 300px;
}
</style>
