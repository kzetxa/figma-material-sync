/**
 * Cleans and normalizes SVG content for Figma import
 */

import { logger } from '../utils/logger.js';
import { COMPONENT_SIZE } from '../utils/constants.js';

export class SvgCleaner {
  /**
   * Clean and normalize SVG content
   */
  static cleanSvg(svgContent, iconName) {
    try {
      let cleanedSvg = svgContent;

      // Remove XML declaration and DOCTYPE if present
      cleanedSvg = cleanedSvg.replace(/<\?xml[^>]*\?>/gi, '');
      cleanedSvg = cleanedSvg.replace(/<!DOCTYPE[^>]*>/gi, '');

      // Normalize viewBox to 24x24
      cleanedSvg = cleanedSvg.replace(
        /viewBox="[^"]*"/gi, 
        `viewBox="0 0 ${COMPONENT_SIZE} ${COMPONENT_SIZE}"`
      );

      // Set consistent width and height
      cleanedSvg = cleanedSvg.replace(/width="[^"]*"/gi, `width="${COMPONENT_SIZE}"`);
      cleanedSvg = cleanedSvg.replace(/height="[^"]*"/gi, `height="${COMPONENT_SIZE}"`);

      // Remove metadata, comments, and unnecessary attributes
      cleanedSvg = cleanedSvg.replace(/<!--[\s\S]*?-->/g, '');
      cleanedSvg = cleanedSvg.replace(/\s+xmlns:xlink="[^"]*"/g, '');
      cleanedSvg = cleanedSvg.replace(/\s+enable-background="[^"]*"/g, '');
      cleanedSvg = cleanedSvg.replace(/\s+xml:space="[^"]*"/g, '');

      // Ensure xmlns attribute is present
      if (!cleanedSvg.includes('xmlns="http://www.w3.org/2000/svg"')) {
        cleanedSvg = cleanedSvg.replace(
          '<svg',
          '<svg xmlns="http://www.w3.org/2000/svg"'
        );
      }

      // Remove extra whitespace and normalize
      cleanedSvg = cleanedSvg.replace(/\s+/g, ' ').trim();

      // Validate that it's still a valid SVG
      if (!cleanedSvg.includes('<svg') || !cleanedSvg.includes('</svg>')) {
        throw new Error('Invalid SVG structure after cleaning');
      }

      return cleanedSvg;
    } catch (error) {
      logger.error(`Failed to clean SVG for icon ${iconName}:`, error.message);
      throw error;
    }
  }

  /**
   * Extract SVG path data for Figma vector creation
   */
  static extractPathData(svgContent) {
    const pathMatches = svgContent.match(/<path[^>]*d="([^"]+)"/gi);
    if (!pathMatches) {
      return null;
    }

    return pathMatches.map(match => {
      const dMatch = match.match(/d="([^"]+)"/);
      const fillMatch = match.match(/fill="([^"]+)"/);
      
      return {
        d: dMatch ? dMatch[1] : '',
        fill: fillMatch ? fillMatch[1] : '#000000'
      };
    });
  }

  /**
   * Convert SVG to Figma-compatible format
   */
  static toFigmaVector(svgContent, iconName) {
    try {
      const cleanedSvg = this.cleanSvg(svgContent, iconName);
      const pathData = this.extractPathData(cleanedSvg);

      if (!pathData || pathData.length === 0) {
        throw new Error('No path data found in SVG');
      }

      // For Figma, we'll use the SVG string directly
      // The Figma API can handle SVG imports
      return {
        svgString: cleanedSvg,
        pathData: pathData,
        bounds: {
          x: 0,
          y: 0,
          width: COMPONENT_SIZE,
          height: COMPONENT_SIZE
        }
      };
    } catch (error) {
      logger.error(`Failed to convert SVG to Figma vector for ${iconName}:`, error.message);
      throw error;
    }
  }

  /**
   * Batch process multiple SVGs
   */
  static async processIconBatch(icons) {
    logger.info(`Processing ${icons.length} SVG icons...`);
    
    const processedIcons = [];
    let successCount = 0;
    let errorCount = 0;

    for (const icon of icons) {
      try {
        const figmaVector = this.toFigmaVector(icon.svgContent, icon.name);
        processedIcons.push({
          ...icon,
          figmaVector
        });
        successCount++;
      } catch (error) {
        logger.warn(`Skipping icon ${icon.name}:`, error.message);
        errorCount++;
      }
    }

    logger.info(`SVG processing completed: ${successCount} successful, ${errorCount} errors`);
    return processedIcons;
  }

  /**
   * Validate SVG content before processing
   */
  static validateSvg(svgContent, iconName) {
    const checks = [
      {
        test: () => svgContent.includes('<svg'),
        error: 'Missing SVG opening tag'
      },
      {
        test: () => svgContent.includes('</svg>'),
        error: 'Missing SVG closing tag'
      },
      {
        test: () => svgContent.includes('<path') || svgContent.includes('<circle') || svgContent.includes('<rect'),
        error: 'No drawable content found'
      },
      {
        test: () => svgContent.length > 0 && svgContent.length < 50000,
        error: 'SVG content size out of range'
      }
    ];

    for (const check of checks) {
      if (!check.test()) {
        throw new Error(`${check.error} in icon ${iconName}`);
      }
    }

    return true;
  }
} 