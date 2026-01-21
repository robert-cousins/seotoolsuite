import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  outputFileTracingRoot: '/home/robert/projects/seotoolsuite',
  turbopack: {
    root: '/home/robert/projects/seotoolsuite',
  },
};

export default nextConfig;
