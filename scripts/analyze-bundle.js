#!/usr/bin/env node

/**
 * Bundle Analysis Script for INP Optimization
 * 
 * This script helps analyze the bundle size and identify performance bottlenecks
 * that could be affecting Interaction to Next Paint (INP) metrics.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing bundle for INP optimization...\n');

// Check if build exists
const buildDir = path.join(__dirname, '../.next');
if (!fs.existsSync(buildDir)) {
  console.log('❌ No build found. Running build first...\n');
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Analyze bundle
console.log('📊 Bundle Analysis Results:\n');

try {
  // Get build info
  const nextMetaPath = path.join(buildDir, 'static/chunks');
  
  if (fs.existsSync(nextMetaPath)) {
    const files = fs.readdirSync(nextMetaPath);
    
    // Analyze chunk sizes
    let totalSize = 0;
    const chunks = [];
    
    files.forEach(file => {
      if (file.endsWith('.js')) {
        const filePath = path.join(nextMetaPath, file);
        const stats = fs.statSync(filePath);
        const sizeKB = Math.round(stats.size / 1024);
        totalSize += sizeKB;
        
        chunks.push({
          name: file,
          size: sizeKB
        });
      }
    });
    
    // Sort by size
    chunks.sort((a, b) => b.size - a.size);
    
    console.log(`📦 Total JavaScript Bundle Size: ${totalSize} KB\n`);
    
    console.log('🔝 Largest Chunks:');
    chunks.slice(0, 10).forEach((chunk, index) => {
      const sizeStatus = chunk.size > 500 ? '⚠️' : chunk.size > 250 ? '🟡' : '✅';
      console.log(`  ${index + 1}. ${chunk.name}: ${chunk.size} KB ${sizeStatus}`);
    });
    
    // Performance recommendations
    console.log('\n💡 INP Optimization Recommendations:\n');
    
    if (totalSize > 1000) {
      console.log('⚠️  Large bundle size detected (>1MB)');
      console.log('   • Consider code splitting with dynamic imports');
      console.log('   • Use React.lazy() for non-critical components');
      console.log('   • Move heavy libraries to web workers');
    }
    
    const largeCryptoChunks = chunks.filter(c => 
      c.name.includes('crypto') || c.name.includes('encryption') || c.size > 500
    );
    
    if (largeCryptoChunks.length > 0) {
      console.log('🔐 Crypto-related optimizations:');
      console.log('   • Move encryption operations to web workers');
      console.log('   • Use requestIdleCallback for non-urgent crypto tasks');
      console.log('   • Consider streaming encryption for large data');
    }
    
    console.log('🎯 General INP improvements:');
    console.log('   • Use startTransition() for non-urgent updates');
    console.log('   • Throttle scroll and resize events');
    console.log('   • Optimize large lists with virtualization');
    console.log('   • Use scheduler.postTask() for background work');
    
  } else {
    console.log('❌ Build directory structure not found');
  }
  
} catch (error) {
  console.error('❌ Analysis failed:', error.message);
}

console.log('\n✨ For real-time monitoring, use:');
console.log('   npm run dev');
console.log('   Open DevTools > Performance tab');
console.log('   Look for "Total Blocking Time" and "INP" metrics'); 