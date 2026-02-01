import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Use webpack instead of turbopack for custom webpack config
  turbopack: {},
  
  // Performance optimizations for better INP
  experimental: {
    // Enable React 18 features for better performance
    // optimizeCss: true, // Temporarily disabled due to critters module issue
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'crypto-js'
    ],
  },
  
  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle splitting for better INP
    if (!dev && !isServer) {
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Separate crypto libraries
          crypto: {
            test: /[\\/]node_modules[\\/](crypto-js|uuid)[\\/]/,
            name: 'crypto',
            chunks: 'all',
            priority: 30,
          },
          // Separate UI libraries
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
            name: 'ui',
            chunks: 'all',
            priority: 20,
          },
          // Separate animation libraries
          animations: {
            test: /[\\/]node_modules[\\/](framer-motion)[\\/]/,
            name: 'animations',
            chunks: 'all',
            priority: 10,
          },
          // Default vendor chunk
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 5,
          },
        },
      };
    }
    
    // Optimize imports for better tree shaking
    if (!dev) {
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...config.resolve.alias,
        // Optimize lodash imports if used
        'lodash': 'lodash-es',
      };
    }
    
    return config;
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400, // 24 hours
  },
  
  // Enable gzip compression
  compress: true,
  
  // Headers for better caching and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  },
};

export default nextConfig;
