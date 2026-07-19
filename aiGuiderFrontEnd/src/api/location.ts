import http from './index'
import type { ApiResponse, PaginatedData, ScenicSpot } from '@/types/api.types'

// ⚠️ 后端 API 文档未提供景点/位置相关接口，以下均为占位实现

/** @deprecated 后端暂未实现景点列表接口 */
export function getScenicSpots(params?: { category?: string; keyword?: string }) {
  return http.get<ApiResponse<PaginatedData<ScenicSpot>>>('/location/scenic-spots', { params })
}

/** @deprecated 后端暂未实现景点详情接口 */
export function getScenicSpotDetail(spot_id: string) {
  return http.get<ApiResponse<ScenicSpot>>(`/location/scenic-spots/${spot_id}`)
}

/** @deprecated 后端暂未实现附近景点接口 */
export function getNearbySpots(longitude: number, latitude: number, radius = 500) {
  return http.get<ApiResponse<PaginatedData<ScenicSpot>>>('/location/nearby', {
    params: { longitude, latitude, radius },
  })
}
