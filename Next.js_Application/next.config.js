/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Do not fail production builds on lint errors in the reference project.
    ignoreDuringBuilds: true,
  },
  // The FastAPI AI service base URL is read server-side from env.
  env: {
    NEXT_PUBLIC_APP_NAME: 'Agentic Underwriting Copilot',
  },
};

module.exports = nextConfig;
