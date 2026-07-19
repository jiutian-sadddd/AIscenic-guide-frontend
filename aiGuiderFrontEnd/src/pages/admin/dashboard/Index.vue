<template>
  <div class="dashboard">
    <!-- 顶部统计卡片 -->
    <el-row :gutter="16" class="dashboard__cards">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card stat-card--primary">
          <div class="stat-card__value">{{ overview?.serviceCount.today ?? '--' }}</div>
          <div class="stat-card__label">今日服务人次</div>
          <div class="stat-card__trend" :class="trendClass">
            {{ overview?.serviceCount.trend ?? '' }}
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card stat-card--success">
          <div class="stat-card__value">{{ overview?.activeUsers.current ?? '--' }}</div>
          <div class="stat-card__label">当前在线用户</div>
          <div class="stat-card__sub">今日峰值 {{ overview?.activeUsers.peakToday ?? '--' }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card stat-card--warning">
          <div class="stat-card__value">{{ overview?.serviceCount.total ?? '--' }}</div>
          <div class="stat-card__label">累计服务人次</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card stat-card--info">
          <div class="stat-card__value">
            {{ ((overview?.emotionDistribution.positive ?? 0) * 100).toFixed(0) }}%
          </div>
          <div class="stat-card__label">好评率</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区 -->
    <el-row :gutter="16" class="dashboard__charts">
      <!-- 情感趋势曲线 -->
      <el-col :xs="24" :lg="12">
        <el-card header="情感趋势曲线" shadow="hover">
          <div ref="sentimentChartRef" class="chart-container" style="height: 350px" />
        </el-card>
      </el-col>

      <!-- 热门问答词云 / Top 10 -->
      <el-col :xs="24" :lg="12">
        <el-card header="热门问答 TOP 10" shadow="hover">
          <div class="hot-questions">
            <div
              v-for="item in hotQuestions"
              :key="item.rank"
              class="hot-question-item"
            >
              <span class="hot-question-item__rank" :class="rankClass(item.rank)">
                {{ item.rank }}
              </span>
              <span class="hot-question-item__text">{{ item.question }}</span>
              <span class="hot-question-item__count">{{ item.count }}次</span>
            </div>
            <el-empty v-if="!hotQuestions.length" description="暂无数据" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="dashboard__charts">
      <!-- 情感分布饼图 -->
      <el-col :xs="24" :lg="12">
        <el-card header="情感分布" shadow="hover">
          <div ref="emotionChartRef" class="chart-container" style="height: 320px" />
        </el-card>
      </el-col>

      <!-- 满意度趋势 -->
      <el-col :xs="24" :lg="12">
        <el-card header="满意度趋势" shadow="hover">
          <div ref="satisfactionChartRef" class="chart-container" style="height: 320px" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useAdminStore } from '@/stores/admin'
import type { DashboardOverview } from '@/types/api.types'

const adminStore = useAdminStore()

// ==================== 图表 Ref ====================
const sentimentChartRef = ref<HTMLDivElement | null>(null)
const emotionChartRef = ref<HTMLDivElement | null>(null)
const satisfactionChartRef = ref<HTMLDivElement | null>(null)

let sentimentChart: echarts.ECharts | null = null
let emotionChart: echarts.ECharts | null = null
let satisfactionChart: echarts.ECharts | null = null

// ==================== 数据 ====================
const overview = computed<DashboardOverview | null>(() => adminStore.dashboard)
const hotQuestions = computed(() => adminStore.hotQuestions)

const trendClass = computed(() => {
  const t = overview.value?.serviceCount.trend || ''
  return t.startsWith('+') ? 'trend--up' : t.startsWith('-') ? 'trend--down' : ''
})

// ==================== 初始化 ====================
onMounted(async () => {
  await adminStore.fetchDashboard()
  nextTick(() => {
    initSentimentChart()
    initEmotionChart()
    initSatisfactionChart()
  })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  sentimentChart?.dispose()
  emotionChart?.dispose()
  satisfactionChart?.dispose()
})

// ==================== 图表初始化 ====================
function initSentimentChart() {
  if (!sentimentChartRef.value) return
  sentimentChart = echarts.init(sentimentChartRef.value)

  // 满意度趋势作为折线图（后端 sentiment-trend 返回 [{date, score}]）
  const trend = overview.value?.satisfactionTrend || []
  const dates = trend.map((d) => d.date)
  const scores = trend.map((d) => d.score)

  sentimentChart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ value: number; axisValue: string }>) =>
        `${params[0].axisValue}<br/>满意度：${params[0].value.toFixed(2)}`,
    },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: { type: 'value', min: 0, max: 1, axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(0)}%` } },
    series: [
      {
        type: 'line', data: scores, smooth: true,
        areaStyle: { color: 'rgba(102, 126, 234, 0.15)' },
        lineStyle: { color: '#667eea' }, itemStyle: { color: '#667eea' },
      },
    ],
  })
}

function initEmotionChart() {
  if (!emotionChartRef.value) return
  emotionChart = echarts.init(emotionChartRef.value)

  const dist = overview.value?.emotionDistribution
  emotionChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
    series: [
      {
        type: 'pie',
        radius: ['55%', '75%'],
        center: ['50%', '50%'],
        label: { show: true, formatter: '{b}\n{d}%' },
        data: [
          { value: (dist?.positive ?? 0) * 100, name: '正向', itemStyle: { color: '#67c23a' } },
          { value: (dist?.neutral ?? 0) * 100, name: '中性', itemStyle: { color: '#e6a23c' } },
          { value: (dist?.negative ?? 0) * 100, name: '负面', itemStyle: { color: '#f56c6c' } },
        ],
      },
    ],
  })
}

function initSatisfactionChart() {
  if (!satisfactionChartRef.value) return
  satisfactionChart = echarts.init(satisfactionChartRef.value)

  const trend = overview.value?.satisfactionTrend || []
  satisfactionChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: trend.map((d) => d.date) },
    yAxis: { type: 'value', min: 3.5, max: 5 },
    series: [
      {
        type: 'line',
        data: trend.map((d) => d.score),
        smooth: true,
        areaStyle: { color: 'rgba(102, 126, 234, 0.15)' },
        lineStyle: { color: '#667eea' },
        itemStyle: { color: '#667eea' },
      },
    ],
  })
}

// ==================== 响应式 ====================
function handleResize() {
  sentimentChart?.resize()
  emotionChart?.resize()
  satisfactionChart?.resize()
}

function rankClass(rank: number) {
  if (rank === 1) return 'rank--gold'
  if (rank === 2) return 'rank--silver'
  if (rank === 3) return 'rank--bronze'
  return ''
}
</script>

<style scoped lang="scss">
.dashboard {
  &__cards {
    margin-bottom: 16px;
  }

  &__charts {
    margin-bottom: 16px;
  }
}

.stat-card {
  text-align: center;

  &__value {
    font-size: 32px;
    font-weight: 700;
    color: #333;
    margin-bottom: 4px;
  }

  &__label {
    font-size: 14px;
    color: #999;
    margin-bottom: 4px;
  }

  &__sub {
    font-size: 12px;
    color: #bbb;
  }

  &__trend {
    font-size: 13px;
    font-weight: 600;

    &.trend--up { color: #67c23a; }
    &.trend--down { color: #f56c6c; }
  }
}

.hot-questions {
  max-height: 350px;
  overflow-y: auto;
}

.hot-question-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;

  &:last-child { border-bottom: none; }

  &__rank {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: #666;
    flex-shrink: 0;

    &.rank--gold { background: #fff3e0; color: #e65100; }
    &.rank--silver { background: #eceff1; color: #546e7a; }
    &.rank--bronze { background: #fbe9e7; color: #bf360c; }
  }

  &__text {
    flex: 1;
    font-size: 14px;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__count {
    font-size: 13px;
    color: #999;
    flex-shrink: 0;
  }
}
</style>
