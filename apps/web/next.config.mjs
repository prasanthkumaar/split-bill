/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.convex.cloud",
      },
    ],
  },
  transpilePackages: ["@workspace/ui"],
  typescript: { ignoreBuildErrors: true },
}

export default nextConfig
