import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright non gira su Vercel serverless. Lo escludiamo dal bundle.
  // In locale (`npm run dev`) funziona comunque perché è risolto runtime.
  serverExternalPackages: ["playwright", "playwright-core"],
};

export default nextConfig;
