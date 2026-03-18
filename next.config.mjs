/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // NEU: Für Static Export
  basePath: '/pomodoro-timer',  // NEU: Ersetze mit deinem Repo-Namen!
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,  // Hast du schon ✓
  },
}

export default nextConfig