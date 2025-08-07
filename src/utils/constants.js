/**
 * Project constants and configuration
 */

// Material Icons GitHub repository
export const MATERIAL_ICONS_REPO = 'google/material-design-icons';
export const GITHUB_API_BASE = 'https://api.github.com';
export const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';

// Icon styles to include (only Filled and Outlined)
export const INCLUDED_STYLES = ['filled', 'outlined'];

// Figma API configuration
export const FIGMA_API_BASE = 'https://api.figma.com/v1';
export const COMPONENT_SIZE = 24; // 24x24px components

// Material Design icon categories
export const ICON_CATEGORIES = [
  'action',
  'alert',
  'av',
  'communication',
  'content',
  'device',
  'editor',
  'file',
  'hardware',
  'home',
  'image',
  'maps',
  'navigation',
  'notification',
  'places',
  'social',
  'toggle'
];

// Retry configuration
export const RETRY_CONFIG = {
  attempts: 3,
  delay: 1000, // Base delay in ms
  backoff: 2   // Exponential backoff multiplier
};

// GitHub API configuration
export const GITHUB_CONFIG = {
  baseURL: 'https://api.github.com',
  headers: {
    'User-Agent': 'figma-material-sync',
    'Accept': 'application/vnd.github.v3+json'
  }
};

// Figma node types
export const FIGMA_NODE_TYPES = {
  FRAME: 'FRAME',
  COMPONENT: 'COMPONENT',
  VECTOR: 'VECTOR'
}; 