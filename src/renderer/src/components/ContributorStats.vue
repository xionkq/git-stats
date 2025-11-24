<template>
  <div class="contributor-stats">
    <div class="detail-header">
      <button class="back-btn" @click="emit('back')">← 返回列表</button>
      <h2>{{ account }} 的贡献统计</h2>
    </div>

    <div v-if="!stats" class="loading">
      <div class="spinner"></div>
      <p>正在统计贡献...</p>
    </div>

    <div v-else class="stats-content">
      <div class="overview-section">
        <div class="overview-card">
          <h3>总体统计</h3>
          <div class="overview-grid">
            <div class="stat-item">
              <span class="stat-label">总提交数</span>
              <span class="stat-value">{{ stats.totalCommits }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">涉及仓库数</span>
              <span class="stat-value">{{ stats.repositories.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">活跃天数</span>
              <span class="stat-value">{{ stats.dailyStats.length }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="charts-section">
        <div class="chart-container">
          <h3>每日提交趋势</h3>
          <div ref="dailyChartRef" class="chart"></div>
        </div>
      </div>

      <div v-if="stats.yearComparison" class="comparison-section">
        <div class="comparison-header">
          <h3>年份数据对比</h3>
          <div class="year-selectors">
            <div class="year-selector">
              <label>年份1：</label>
              <select v-model="selectedYear1" class="year-select" @change="handleYearChange">
                <option v-for="year in availableYears" :key="year" :value="year">
                  {{ year }}
                </option>
              </select>
            </div>
            <div class="year-selector">
              <label>年份2：</label>
              <select v-model="selectedYear2" class="year-select" @change="handleYearChange">
                <option v-for="year in availableYears" :key="year" :value="year">
                  {{ year }}
                </option>
              </select>
            </div>
          </div>
        </div>
        <div class="comparison-table-container">
          <table class="comparison-table">
            <thead>
              <tr>
                <th class="metric-column">对比项</th>
                <th class="period-column">{{ stats.yearComparison.year1.year }}年</th>
                <th class="period-column">{{ stats.yearComparison.year2.year }}年</th>
                <th class="change-column">变化</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="metric-label">提交次数</td>
                <td class="metric-value">{{ stats.yearComparison.year1.commits }}</td>
                <td class="metric-value">{{ stats.yearComparison.year2.commits }}</td>
                <td
                  class="change-value"
                  :class="
                    getChangeClass(
                      stats.yearComparison.year2.commits - stats.yearComparison.year1.commits
                    )
                  "
                >
                  {{
                    formatChangeWithPercent(
                      stats.yearComparison.year2.commits - stats.yearComparison.year1.commits,
                      stats.yearComparison.year1.commits
                    )
                  }}
                </td>
              </tr>
              <tr>
                <td class="metric-label">新增代码行数</td>
                <td class="metric-value">
                  {{ formatNumber(stats.yearComparison.year1.addedLines) }}
                </td>
                <td class="metric-value">
                  {{ formatNumber(stats.yearComparison.year2.addedLines) }}
                </td>
                <td
                  class="change-value"
                  :class="
                    getChangeClass(
                      stats.yearComparison.year2.addedLines - stats.yearComparison.year1.addedLines
                    )
                  "
                >
                  {{
                    formatChangeWithPercent(
                      stats.yearComparison.year2.addedLines - stats.yearComparison.year1.addedLines,
                      stats.yearComparison.year1.addedLines
                    )
                  }}
                </td>
              </tr>
              <tr>
                <td class="metric-label">删除代码行数</td>
                <td class="metric-value">
                  {{ formatNumber(stats.yearComparison.year1.deletedLines) }}
                </td>
                <td class="metric-value">
                  {{ formatNumber(stats.yearComparison.year2.deletedLines) }}
                </td>
                <td
                  class="change-value"
                  :class="
                    getChangeClass(
                      stats.yearComparison.year2.deletedLines -
                        stats.yearComparison.year1.deletedLines
                    )
                  "
                >
                  {{
                    formatChangeWithPercent(
                      stats.yearComparison.year2.deletedLines -
                        stats.yearComparison.year1.deletedLines,
                      stats.yearComparison.year1.deletedLines
                    )
                  }}
                </td>
              </tr>
              <tr>
                <td class="metric-label">净增代码行数</td>
                <td class="metric-value">
                  {{ formatNumber(stats.yearComparison.year1.netLines) }}
                </td>
                <td class="metric-value">
                  {{ formatNumber(stats.yearComparison.year2.netLines) }}
                </td>
                <td
                  class="change-value"
                  :class="
                    getChangeClass(
                      stats.yearComparison.year2.netLines - stats.yearComparison.year1.netLines
                    )
                  "
                >
                  {{
                    formatChangeWithPercent(
                      stats.yearComparison.year2.netLines - stats.yearComparison.year1.netLines,
                      stats.yearComparison.year1.netLines
                    )
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="repositories-section">
        <h3>各仓库贡献</h3>
        <div class="repo-stats-list">
          <div
            v-for="repoStat in stats.repositories"
            :key="repoStat.repository.path"
            class="repo-stat-card"
          >
            <div class="repo-stat-header">
              <h4>{{ repoStat.repository.name }}</h4>
              <span class="commit-count">{{ repoStat.commits }} 次提交</span>
            </div>
            <p class="repo-path">{{ repoStat.repository.path }}</p>
            <div class="progress-bar-container">
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" :style="{ width: `${repoStat.percentage}%` }"></div>
              </div>
              <span class="percentage">{{ repoStat.percentage.toFixed(1) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import { ContributorStats } from '@types'

interface Props {
  stats: ContributorStats | null
  account: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  back: []
  yearChange: [year1: number, year2: number]
}>()

const dailyChartRef = ref<HTMLDivElement>()
let dailyChart: echarts.ECharts | null = null

const currentYear = new Date().getFullYear()
const selectedYear1 = ref(currentYear - 1)
const selectedYear2 = ref(currentYear)

// 从统计数据中提取所有可用的年份
const availableYears = computed(() => {
  if (!props.stats) {
    const years: number[] = []
    // 生成最近10年的年份列表
    for (let i = 0; i < 10; i++) {
      years.push(currentYear - i)
    }
    return years
  }

  // 从提交记录中提取所有年份
  const yearSet = new Set<number>()
  props.stats.repositories.forEach((repoStat) => {
    repoStat.commitsList.forEach((commit) => {
      const commitYear = new Date(commit.date).getFullYear()
      yearSet.add(commitYear)
    })
  })

  const years = Array.from(yearSet).sort((a, b) => b - a)
  return years.length > 0 ? years : [currentYear, currentYear - 1]
})

const handleYearChange = (): void => {
  if (selectedYear1.value && selectedYear2.value) {
    emit('yearChange', selectedYear1.value, selectedYear2.value)
  }
}

// 初始化年份选择
watch(
  () => props.stats,
  (newStats) => {
    if (newStats && newStats.yearComparison) {
      selectedYear1.value = newStats.yearComparison.year1.year
      selectedYear2.value = newStats.yearComparison.year2.year
    } else if (newStats) {
      // 如果没有年份对比数据，从可用年份中选择
      const years = availableYears.value
      if (years.length >= 2) {
        selectedYear1.value = years[1]
        selectedYear2.value = years[0]
      }
    }
  },
  { immediate: true }
)

const formatNumber = (num: number): string => {
  return num.toLocaleString('zh-CN')
}

const formatChangeWithPercent = (change: number, baseValue: number): string => {
  if (change === 0) return '0'

  const sign = change > 0 ? '+' : ''
  const changeStr = `${sign}${change.toLocaleString('zh-CN')}`

  // 计算百分比
  let percentStr = ''
  if (baseValue !== 0) {
    const percent = (change / baseValue) * 100
    const percentSign = percent > 0 ? '+' : ''
    percentStr = ` (${percentSign}${percent.toFixed(1)}%)`
  } else if (change !== 0) {
    // 如果基数为0但变化不为0，显示为无穷大或特殊标记
    percentStr = ' (—)'
  }

  return `${changeStr}${percentStr}`
}

const getChangeClass = (change: number): string => {
  if (change > 0) return 'change-positive'
  if (change < 0) return 'change-negative'
  return 'change-neutral'
}

const createDailyChart = (): void => {
  if (!dailyChartRef.value || !props.stats) return

  if (dailyChart) {
    dailyChart.dispose()
  }

  dailyChart = echarts.init(dailyChartRef.value)

  const data = props.stats.dailyStats.map((stat) => [stat.date, stat.commits])

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: props.stats.dailyStats.map((stat) => stat.date)
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '提交次数',
        type: 'line',
        data: data.map((item) => item[1]),
        smooth: true,
        itemStyle: {
          color: '#007acc'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 122, 204, 0.3)' },
              { offset: 1, color: 'rgba(0, 122, 204, 0.05)' }
            ]
          }
        }
      }
    ]
  }

  dailyChart.setOption(option)
}

const resizeChart = (): void => {
  if (dailyChart) {
    dailyChart.resize()
  }
}

watch(
  () => props.stats,
  (newStats) => {
    if (newStats) {
      setTimeout(() => {
        createDailyChart()
      }, 100)
    }
  },
  { immediate: true }
)

onMounted(() => {
  window.addEventListener('resize', resizeChart)
})

onUnmounted(() => {
  if (dailyChart) {
    dailyChart.dispose()
    dailyChart = null
  }
  window.removeEventListener('resize', resizeChart)
})
</script>

<style scoped>
.contributor-stats {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
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
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.overview-section {
  background: white;
  border: 1px solid #d1d9e0;
  border-radius: 8px;
  padding: 20px;
}

.overview-card h3 {
  margin: 0 0 16px 0;
  color: #24292f;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-label {
  font-size: 14px;
  color: #656d76;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #007acc;
}

.repositories-section {
  background: white;
  border: 1px solid #d1d9e0;
  border-radius: 8px;
  padding: 20px;
}

.repositories-section h3 {
  margin: 0 0 16px 0;
  color: #24292f;
}

.repo-stats-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.repo-stat-card {
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  padding: 16px;
  background: #f6f8fa;
}

.repo-stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.repo-stat-header h4 {
  margin: 0;
  font-size: 16px;
  color: #24292f;
}

.commit-count {
  font-size: 14px;
  color: #007acc;
  font-weight: 500;
}

.repo-path {
  color: #656d76;
  font-size: 12px;
  margin-bottom: 12px;
  word-break: break-all;
}

.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar-bg {
  flex: 1;
  height: 8px;
  background: #e1e4e8;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #007acc, #0056b3);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.percentage {
  font-size: 14px;
  color: #656d76;
  min-width: 50px;
  text-align: right;
}

.charts-section {
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
  height: 400px;
}

.comparison-section {
  background: white;
  border: 1px solid #d1d9e0;
  border-radius: 8px;
  padding: 20px;
}

.comparison-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.comparison-header h3 {
  margin: 0;
  color: #24292f;
}

.year-selectors {
  display: flex;
  align-items: center;
  gap: 16px;
}

.year-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.year-selector label {
  font-size: 14px;
  color: #656d76;
}

.year-select {
  padding: 6px 0;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  font-size: 14px;
  color: #24292f;
  background: white;
  cursor: pointer;
  outline: none;
  min-width: 100px;
}

.year-select:hover {
  border-color: #007acc;
}

.year-select:focus {
  border-color: #007acc;
  box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.1);
}

.comparison-table-container {
  overflow-x: auto;
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.comparison-table thead {
  background: #f6f8fa;
}

.comparison-table th {
  padding: 12px 16px;
  font-weight: 600;
  color: #24292f;
  border-bottom: 2px solid #d1d9e0;
}

.comparison-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e1e4e8;
}

.comparison-table tbody tr:hover {
  background: #f6f8fa;
}

.metric-column {
  width: 150px;
  font-weight: 600;
}

.period-column {
  width: 180px;
  text-align: center;
}

.change-column {
  width: 120px;
  text-align: center;
}

.metric-label {
  color: #656d76;
  font-weight: 500;
  text-align: center;
}

.metric-value {
  text-align: center;
  color: #24292f;
  font-weight: 500;
}

.change-value {
  text-align: center;
  font-weight: 600;
}

.change-positive {
  color: #28a745;
}

.change-negative {
  color: #dc3545;
}

.change-neutral {
  color: #656d76;
}
</style>
