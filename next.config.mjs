/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'
const isTauri = process.env.TAURI_BUILD === '1'

const nextConfig = {
  output: 'export',
  basePath: isProd && !isTauri ? '/pomodoro-timer' : '',
  env: {
    NEXT_PUBLIC_BASE_PATH: isProd && !isTauri ? '/pomodoro-timer' : '',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig