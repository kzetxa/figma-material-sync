#!/usr/bin/env node

/**
 * Figma Material Icons Sync
 * 
 * Main entry point for syncing Google Material Icons to Figma
 * Orchestrates the entire process from fetching icons to creating Figma components
 */

import 'dotenv/config';
import fs from 'fs-extra';
import path from 'path';

// Import our modules
import { MaterialIconsFetcher } from './src/fetchers/materialIcons.js';
import { SvgCleaner } from './src/processors/svgCleaner.js';
import { FigmaClient } from './src/figma/client.js';
import { FigmaComponentManager } from './src/figma/components.js';
import { logger } from './src/utils/logger.js';

class MaterialIconsSyncManager {
  constructor() {
    this.validateEnvironment();
    
    // Initialize components
    this.iconsFetcher = new MaterialIconsFetcher(process.env.GITHUB_TOKEN);
    this.figmaClient = new FigmaClient(process.env.FIGMA_ACCESS_TOKEN);
    this.componentManager = new FigmaComponentManager(this.figmaClient);
    
    this.tempDir = path.join(process.cwd(), 'temp');
  }

  /**
   * Validate required environment variables
   */
  validateEnvironment() {
    const required = ['FIGMA_ACCESS_TOKEN'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      logger.error(`Missing required environment variables: ${missing.join(', ')}`);
      logger.info('Please create a .env file with your Figma access token');
      logger.info('Example: FIGMA_ACCESS_TOKEN=your_token_here');
      process.exit(1);
    }
    
    // Optional GitHub token for higher rate limits
    if (!process.env.GITHUB_TOKEN) {
      logger.warn('⚠️ No GITHUB_TOKEN provided. You may hit rate limits with large downloads.');
      logger.info('💡 To avoid rate limits, create a GitHub token at: https://github.com/settings/tokens');
    }
  }

  /**
   * Main sync process
   */
  async sync() {
    const startTime = Date.now();
    
    try {
      logger.info('🚀 Starting Material Icons sync to Figma...');
      
      // Step 1: Test Figma connection
      await this.testFigmaConnection();
      
      // Step 2: Fetch all Material Icons
      const allIcons = await this.fetchMaterialIcons();
      
      // Step 3: Process SVGs for Figma compatibility
      const processedIcons = await this.processSvgIcons(allIcons);
      
      // Step 4: Organize icons for Figma structure
      const organizedComponents = await this.organizeForFigma(processedIcons);
      
      // Step 5: Sync to Figma
      await this.syncToFigma(organizedComponents);
      
      // Step 6: Cleanup
      await this.cleanup();
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      logger.info(`✅ Sync completed successfully in ${duration} seconds`);
      
    } catch (error) {
      logger.error('❌ Sync failed:', error.message);
      
      if (process.env.LOG_LEVEL === 'DEBUG') {
        logger.error('Stack trace:', error.stack);
      }
      
      process.exit(1);
    }
  }

  /**
   * Test Figma API connection
   */
  async testFigmaConnection() {
    logger.info('📡 Testing Figma API connection...');
    await this.figmaClient.testConnection();
  }

  /**
   * Fetch all Material Icons from GitHub
   */
  async fetchMaterialIcons() {
    logger.info('📦 Fetching Material Icons from GitHub...');
    
    // Check if we should test with just one category
    const testCategory = process.env.TEST_CATEGORY;
    
    if (testCategory) {
      logger.info(`🧪 Testing with single category: ${testCategory}`);
      const icons = await this.iconsFetcher.downloadSingleCategory(testCategory);
      await this.iconsFetcher.saveIconsToTemp(icons);
      
      const totalIcons = Object.values(icons[testCategory] || {}).reduce((total, style) => {
        return total + (Array.isArray(style) ? style.length : 0);
      }, 0);
      
      logger.info(`📊 Downloaded ${totalIcons} icons from test category: ${testCategory}`);
      return icons;
    }
    
    const icons = await this.iconsFetcher.downloadAllIcons();
    
    // Save to temp directory for debugging/inspection
    await this.iconsFetcher.saveIconsToTemp(icons);
    
    // Log summary
    const totalIcons = Object.values(icons).reduce((total, category) => {
      return total + Object.values(category).reduce((catTotal, style) => {
        return catTotal + (Array.isArray(style) ? style.length : 0);
      }, 0);
    }, 0);
    
    logger.info(`📊 Downloaded ${totalIcons} icons across ${Object.keys(icons).length} categories`);
    return icons;
  }

  /**
   * Process SVG icons for Figma compatibility
   */
  async processSvgIcons(allIcons) {
    logger.info('🔧 Processing SVG icons for Figma compatibility...');
    
    const processedIcons = {};
    
    for (const [categoryName, styles] of Object.entries(allIcons)) {
      processedIcons[categoryName] = {};
      
      for (const [styleName, icons] of Object.entries(styles)) {
        if (!Array.isArray(icons)) continue;
        
        logger.debug(`Processing ${icons.length} ${styleName} icons in ${categoryName}`);
        processedIcons[categoryName][styleName] = await SvgCleaner.processIconBatch(icons);
      }
    }
    
    return processedIcons;
  }

  /**
   * Organize icons for Figma component structure
   */
  async organizeForFigma(processedIcons) {
    logger.info('🏗️ Organizing icons for Figma component structure...');
    
    const organizedComponents = this.componentManager.organizeIconsForFigma(processedIcons);
    
    // Save organization summary for debugging
    const summaryPath = path.join(this.tempDir, 'figma-structure.json');
    await fs.ensureDir(this.tempDir);
    await fs.writeJson(summaryPath, {
      totalCategories: organizedComponents.length,
      categories: organizedComponents.map(comp => ({
        name: comp.name,
        componentCount: comp.children?.length || 0
      })),
      generatedAt: new Date().toISOString()
    }, { spaces: 2 });
    
    logger.info(`📝 Structure summary saved to ${summaryPath}`);
    return organizedComponents;
  }

  /**
   * Sync organized components to Figma
   */
  async syncToFigma(organizedComponents) {
    logger.info('🎨 Syncing to Figma...');
    
    const fileKey = process.env.FIGMA_FILE_KEY;
    
    if (!fileKey) {
      logger.warn('⚠️ No FIGMA_FILE_KEY provided.');
      logger.info('💡 Please create a new Figma file and set FIGMA_FILE_KEY in your .env file');
      logger.info('   You can find the file key in the Figma URL: figma.com/file/FILE_KEY/...');
      logger.info('   The sync has prepared the component structure - run again with a file key to complete.');
      return;
    }

    try {
      // Verify file access
      await this.figmaClient.getFile(fileKey);
      logger.info(`📄 Connected to Figma file: ${fileKey}`);

      // For the MVP, we'll simulate the sync since direct node creation via REST API
      // has limitations. In a real implementation, you'd use the Plugin API or
      // file upload endpoints with specific formatting.
      
      logger.info('🚧 Simulating Figma sync (API limitations noted)...');
      logger.info(`   Prepared ${organizedComponents.length} category frames`);
      
      const totalComponents = organizedComponents.reduce((total, category) => {
        return total + (category.children?.length || 0);
      }, 0);
      
      logger.info(`   Ready to create ${totalComponents} icon components`);
      
      // Save the payload for manual import or plugin development
      const payloadPath = path.join(this.tempDir, 'figma-payload.json');
      const payload = this.componentManager.generateBatchPayload(organizedComponents);
      
      await fs.writeJson(payloadPath, payload, { spaces: 2 });
      logger.info(`💾 Figma import payload saved to ${payloadPath}`);
      
      logger.info('📋 Next steps:');
      logger.info('   1. The component structure has been prepared');
      logger.info('   2. For full automation, consider developing a Figma plugin');
      logger.info('   3. Alternatively, use the generated payload with Figma\'s import tools');
      
    } catch (error) {
      if (error.message.includes('not found')) {
        logger.error('❌ Figma file not found. Please check your FIGMA_FILE_KEY');
        logger.info('💡 Create a new file in Figma and copy its key from the URL');
      } else {
        throw error;
      }
    }
  }

  /**
   * Cleanup temporary files
   */
  async cleanup() {
    logger.info('🧹 Cleaning up temporary files...');
    
    try {
      const keepFiles = ['figma-structure.json', 'figma-payload.json', 'icons'];
      const tempContents = await fs.readdir(this.tempDir);
      
      for (const item of tempContents) {
        if (!keepFiles.includes(item)) {
          await fs.remove(path.join(this.tempDir, item));
        }
      }
      
      logger.info('✨ Cleanup completed');
    } catch (error) {
      logger.warn('⚠️ Cleanup failed:', error.message);
    }
  }

  /**
   * Generate sync report
   */
  async generateReport() {
    const reportPath = path.join(this.tempDir, 'sync-report.json');
    
    const report = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      status: 'completed',
      summary: {
        totalCategories: 0,
        totalIcons: 0,
        successfulIcons: 0,
        failedIcons: 0
      }
    };

    await fs.writeJson(reportPath, report, { spaces: 2 });
    logger.info(`📊 Sync report saved to ${reportPath}`);
  }
}

/**
 * CLI handling and main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Handle CLI arguments
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Figma Material Icons Sync

Usage:
  npm run sync              Run the full sync process
  npm run sync:verbose      Run with debug logging

Environment Variables:
  FIGMA_ACCESS_TOKEN        Your Figma personal access token (required)
  FIGMA_FILE_KEY           Target Figma file key (optional)
  LOG_LEVEL                Logging level: ERROR, WARN, INFO, DEBUG

Examples:
  FIGMA_ACCESS_TOKEN=figd_xxx npm run sync
  FIGMA_FILE_KEY=abc123 npm run sync:verbose
    `);
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    const packageJson = await fs.readJson('./package.json');
    console.log(`figma-material-sync v${packageJson.version}`);
    process.exit(0);
  }

  // Run the sync
  const syncManager = new MaterialIconsSyncManager();
  await syncManager.sync();
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  logger.info('\n👋 Sync interrupted by user');
  process.exit(0);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    logger.error('💥 Fatal error:', error.message);
    process.exit(1);
  });
}


