/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Allow file uploads through server actions (default is ~1MB).
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
