import http from './index'
import type {
  ApiResponse,
  PaginatedData,
  PaginationParams,
  DashboardOverview,
  SentimentDataPoint,
  AnalysisReport,
} from '@/types/api.types'

/** 获取数据大屏概览 */
export function getDashboardOverview() {
  return http.get<ApiResponse<DashboardOverview>>('/analytics/dashboard')
}

/** 获取热门问答排行（limit 为返回条数，默认 10） */
export function getHotQuestions(limit = 10) {
  return http.get<ApiResponse<Array<{ rank: number; question: string; count: number }>>>(
    '/analytics/hot-questions',
    { params: { limit } },
  )
}

/** 获取情感趋势变化（days 为统计天数，默认 7） */
export function getSentimentTrend(days = 7) {
  return http.get<ApiResponse<SentimentDataPoint[]>>('/analytics/sentiment-trend', { params: { days } })
}

/** 获取服务次数统计（period: today / week / month，默认 today） */
export function getServiceCount(period: 'today' | 'week' | 'month' = 'today') {
  return http.get<ApiResponse<{ total: number; today: number; week: number; trend: string }>>(
    '/analytics/service-count',
    { params: { period } },
  )
}

/** 获取历史分析报告列表 */
export function getReports(params?: PaginationParams & { type?: string }) {
  return http.get<ApiResponse<PaginatedData<AnalysisReport>>>('/analytics/reports', { params })
}

/** 获取指定报告详情 */
export function getReportDetail(report_id: string) {
  return http.get<ApiResponse<AnalysisReport>>(`/analytics/reports/${report_id}`)
}

/** 导出今日数据为 CSV */
export function exportTodayCsv() {
  return http.get('/analytics/export/today', { responseType: 'blob' })
}
