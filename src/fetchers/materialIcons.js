/**
 * Fetches Material Icons from Google's GitHub repository
 */

import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';
import { 
  MATERIAL_ICONS_REPO, 
  GITHUB_API_BASE, 
  GITHUB_RAW_BASE, 
  INCLUDED_STYLES,
  ICON_CATEGORIES,
  RETRY_CONFIG,
  GITHUB_CONFIG
} from '../utils/constants.js';

export class MaterialIconsFetcher {
  constructor(githubToken = null) {
    this.baseUrl = `${GITHUB_API_BASE}/repos/${MATERIAL_ICONS_REPO}`;
    this.rawUrl = `${GITHUB_RAW_BASE}/${MATERIAL_ICONS_REPO}/master`;
    this.githubToken = githubToken;
    
    // Configure axios with GitHub token if provided
    this.axiosConfig = {
      headers: {
        ...GITHUB_CONFIG.headers
      }
    };
    
    if (this.githubToken) {
      this.axiosConfig.headers['Authorization'] = `token ${this.githubToken}`;
    }
  }

  /**
   * Fetch icon metadata and directory structure
   */
  async fetchIconMetadata() {
    logger.info('Fetching Material Icons metadata...');
    
    try {
      // Get the icons directory structure
      const response = await axios.get(`${this.baseUrl}/contents/src`, this.axiosConfig);
      const iconDirs = response.data.filter(item => 
        item.type === 'dir' && ICON_CATEGORIES.includes(item.name)
      );

      logger.info(`Found ${iconDirs.length} icon categories`);
      return iconDirs;
    } catch (error) {
      logger.error('Failed to fetch icon metadata:', error.message);
      throw error;
    }
  }

  /**
   * Get all icons for a specific category
   */
  async getIconsInCategory(categoryName) {
    logger.debug(`Fetching icons for category: ${categoryName}`);
    
          try {
        // Get all icon directories in the category
        const response = await axios.get(
          `${this.baseUrl}/contents/src/${categoryName}`,
          this.axiosConfig
        );
      
      // Filter for icon directories (exclude any non-directory items)
      const iconDirectories = response.data.filter(item => 
        item.type === 'dir' && !item.name.startsWith('.')
      );

      const icons = {
        filled: [],
        outlined: []
      };
      
      // Process each icon directory
      for (const iconDir of iconDirectories) {
        const iconName = iconDir.name;
        
        try {
          // Check for filled version (materialicons/24px.svg)
          const filledResponse = await axios.get(
            `${this.baseUrl}/contents/src/${categoryName}/${iconName}/materialicons`,
            this.axiosConfig
          );
          
          const filledSvg = filledResponse.data.find(item => 
            item.name === '24px.svg'
          );
          
          if (filledSvg) {
            icons.filled.push({
              name: iconName,
              downloadUrl: filledSvg.download_url,
              path: filledSvg.path
            });
          }
          
          // Check for outlined version (materialiconsoutlined/24px.svg)
          const outlinedResponse = await axios.get(
            `${this.baseUrl}/contents/src/${categoryName}/${iconName}/materialiconsoutlined`,
            this.axiosConfig
          );
          
          const outlinedSvg = outlinedResponse.data.find(item => 
            item.name === '24px.svg'
          );
          
          if (outlinedSvg) {
            icons.outlined.push({
              name: iconName,
              downloadUrl: outlinedSvg.download_url,
              path: outlinedSvg.path
            });
          }
          
        } catch (iconError) {
          // Skip icons that don't have both styles
          logger.debug(`Skipping icon ${iconName}: missing filled or outlined version`);
        }
      }

      return icons;
    } catch (error) {
      logger.error(`Failed to fetch icons for category ${categoryName}:`, error.message);
      throw error;
    }
  }

  /**
   * Download SVG content with retry logic
   */
  async downloadSvg(url, retryCount = 0) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          ...GITHUB_CONFIG.headers,
          ...(this.githubToken && { 'Authorization': `token ${this.githubToken}` })
        }
      });
      return response.data;
    } catch (error) {
      if (retryCount < RETRY_CONFIG.attempts) {
        const delay = RETRY_CONFIG.delay * Math.pow(RETRY_CONFIG.backoff, retryCount);
        logger.warn(`Download failed, retrying in ${delay}ms... (${retryCount + 1}/${RETRY_CONFIG.attempts})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.downloadSvg(url, retryCount + 1);
      }
      
      logger.error(`Failed to download SVG after ${RETRY_CONFIG.attempts} attempts:`, error.message);
      throw error;
    }
  }

  /**
   * Download icons for a single category (for testing)
   */
  async downloadSingleCategory(categoryName) {
    logger.info(`Starting download for single category: ${categoryName}`);
    
    const allIcons = {};
    
    try {
      const categoryIcons = await this.getIconsInCategory(categoryName);
      allIcons[categoryName] = {};

      // Download SVGs for each style
      for (const style of INCLUDED_STYLES) {
        if (!categoryIcons[style]) continue;
        
        allIcons[categoryName][style] = [];
        
        for (const icon of categoryIcons[style]) {
          try {
            const svgContent = await this.downloadSvg(icon.downloadUrl);
            allIcons[categoryName][style].push({
              ...icon,
              svgContent
            });
            
            // Add small delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            logger.warn(`Skipping icon ${icon.name} in ${categoryName}/${style}:`, error.message);
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to download category ${categoryName}:`, error.message);
      throw error;
    }

    logger.info(`Single category download completed for: ${categoryName}`);
    return allIcons;
  }

  /**
   * Download all icons for all categories
   */
  async downloadAllIcons() {
    logger.info('Starting Material Icons download...');
    
    const categories = await this.fetchIconMetadata();
    const allIcons = {};

    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      logger.progress(i + 1, categories.length, `Processing category: ${category.name}`);
      
      try {
        const categoryIcons = await this.getIconsInCategory(category.name);
        allIcons[category.name] = {};

        // Download SVGs for each style
        for (const style of INCLUDED_STYLES) {
          if (!categoryIcons[style]) continue;
          
          allIcons[category.name][style] = [];
          
          for (const icon of categoryIcons[style]) {
            try {
              const svgContent = await this.downloadSvg(icon.downloadUrl);
              allIcons[category.name][style].push({
                ...icon,
                svgContent
              });
              
              // Add small delay to respect rate limits
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
              logger.warn(`Skipping icon ${icon.name} in ${category.name}/${style}:`, error.message);
            }
          }
        }
        
        // Add delay between categories to avoid rate limiting
        if (i < categories.length - 1) {
          logger.debug(`Waiting 2 seconds before next category...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        logger.warn(`Skipping category ${category.name}:`, error.message);
        
        // If we hit rate limits, wait longer
        if (error.message.includes('403')) {
          logger.info('Rate limit detected, waiting 60 seconds...');
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
      }
    }

    logger.info('Material Icons download completed');
    return allIcons;
  }

  /**
   * Save icons to temporary directory for processing
   */
  async saveIconsToTemp(icons) {
    const tempDir = path.join(process.cwd(), 'temp', 'icons');
    await fs.ensureDir(tempDir);

    for (const [category, styles] of Object.entries(icons)) {
      for (const [style, iconList] of Object.entries(styles)) {
        const categoryDir = path.join(tempDir, category, style);
        await fs.ensureDir(categoryDir);

        for (const icon of iconList) {
          const filePath = path.join(categoryDir, `${icon.name}.svg`);
          await fs.writeFile(filePath, icon.svgContent);
        }
      }
    }

    logger.info(`Icons saved to ${tempDir}`);
  }
} 