import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type ProxyOptions } from 'vite'

/**
 * Cấu hình Proxy thông minh:
 * Tự động bắt lỗi ECONNREFUSED khi backend microservice chưa khởi động,
 * trả về HTTP 503 kèm JSON có định dạng chuẩn thay vì để Vite in AggregateError tràn terminal.
 */
const createProxyWithFallback = (target: string): ProxyOptions => ({
  target,
  changeOrigin: true,
  configure: (proxy) => {
    proxy.on('error', (err, _req, res) => {
      if (res && !('headersSent' in res && res.headersSent) && typeof (res as any).writeHead === 'function') {
        try {
          (res as any).writeHead(503, {
            'Content-Type': 'application/json; charset=utf-8',
          });
          (res as any).end(
            JSON.stringify({
              success: false,
              offline: true,
              message: `Dịch vụ backend tại ${target} hiện chưa hoạt động (${(err as any)?.code || 'ECONNREFUSED'}).`,
              data: [],
            })
          );
        } catch {
          // Bỏ qua lỗi stream nếu kết nối bị hủy sớm bởi client
        }
      }
    });
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/v1/bookings': createProxyWithFallback('http://localhost:8083'),
      '/api/v1/auth': createProxyWithFallback('http://localhost:8081'),
      '/api/v1/reviews': createProxyWithFallback('http://localhost:8081'),
      '/api/v1/restaurant': createProxyWithFallback('http://localhost:8082'),
      '/api/v1/floor-plans': createProxyWithFallback('http://localhost:8082'),
      '/api/v1/tables': createProxyWithFallback('http://localhost:8082'),
      '/api/v1/menu': createProxyWithFallback('http://localhost:8082'),
      '/api/v1/payments': createProxyWithFallback('http://localhost:8084'),
      '/api': createProxyWithFallback('http://localhost:8080'),
    },
  },
})
