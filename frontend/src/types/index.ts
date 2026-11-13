/** 后端统一响应体 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}
