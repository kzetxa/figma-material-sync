/**
 * Figma REST API client for authentication and basic operations
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';
import { FIGMA_API_BASE, RETRY_CONFIG } from '../utils/constants.js';

export class FigmaClient {
  constructor(accessToken) {
    if (!accessToken) {
      throw new Error('Figma access token is required');
    }

    this.accessToken = accessToken;
    this.baseURL = FIGMA_API_BASE;
    
    // Configure axios instance with authentication
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-Figma-Token': this.accessToken,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Add request/response interceptors for logging and error handling
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`Figma API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Figma API Request Error:', error.message);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`Figma API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        logger.error(`Figma API Error ${status}:`, message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Test API authentication
   */
  async testConnection() {
    try {
      logger.info('Testing Figma API connection...');
      const response = await this.client.get('/me');
      logger.info(`Connected to Figma as: ${response.data.email}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to connect to Figma API:', error.message);
      throw new Error('Invalid Figma access token or API connection failed');
    }
  }

  /**
   * Get file information
   */
  async getFile(fileKey) {
    try {
      const response = await this.client.get(`/files/${fileKey}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Figma file ${fileKey} not found or access denied`);
      }
      throw error;
    }
  }

  /**
   * Create a new Figma file
   */
  async createFile(fileName = 'Material Icons Library') {
    try {
      logger.info(`Creating new Figma file: ${fileName}`);
      
      // Note: The Figma REST API doesn't have a direct endpoint to create files
      // This is a limitation - files need to be created manually in the Figma UI
      // We'll provide instructions for this in the setup process
      
      throw new Error(
        'File creation must be done manually in Figma UI. ' +
        'Please create a new file and provide the file key in FIGMA_FILE_KEY environment variable.'
      );
    } catch (error) {
      logger.error('Failed to create Figma file:', error.message);
      throw error;
    }
  }

  /**
   * Post nodes to a Figma file
   */
  async postNodesToFile(fileKey, payload) {
    try {
      const response = await this.client.post(`/files/${fileKey}/nodes`, payload);
      return response.data;
    } catch (error) {
      logger.error('Failed to post nodes to Figma:', error.message);
      throw error;
    }
  }

  /**
   * Create images from SVG
   */
  async createImageFromSvg(svgContent) {
    try {
      // Convert SVG to base64 for Figma import
      const svgBase64 = Buffer.from(svgContent).toString('base64');
      
      const payload = {
        format: 'SVG',
        data: svgBase64
      };

      const response = await this.client.post('/images', payload);
      return response.data;
    } catch (error) {
      logger.error('Failed to create image from SVG:', error.message);
      throw error;
    }
  }

  /**
   * Retry wrapper for API calls
   */
  async withRetry(operation, context = '') {
    let lastError;
    
    for (let attempt = 1; attempt <= RETRY_CONFIG.attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === RETRY_CONFIG.attempts) {
          break;
        }

        // Don't retry on authentication or permission errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          break;
        }

        const delay = RETRY_CONFIG.delay * Math.pow(RETRY_CONFIG.backoff, attempt - 1);
        logger.warn(`${context} failed (attempt ${attempt}), retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Update file with new nodes (batch operation)
   */
  async batchUpdateFile(fileKey, operations) {
    logger.info(`Performing batch update with ${operations.length} operations`);
    
    const results = [];
    const batchSize = 10; // Process in small batches to avoid rate limits

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      logger.progress(i + batch.length, operations.length, 'Updating Figma file');

      for (const operation of batch) {
        try {
          const result = await this.withRetry(
            () => this.postNodesToFile(fileKey, operation),
            'Batch update operation'
          );
          results.push(result);
        } catch (error) {
          logger.warn('Failed batch operation:', error.message);
          results.push({ error: error.message });
        }
      }

      // Small delay between batches to respect rate limits
      if (i + batchSize < operations.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
} 