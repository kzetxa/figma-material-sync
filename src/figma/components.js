/**
 * Creates and manages Figma components for Material Icons
 */

import { logger } from '../utils/logger.js';
import { COMPONENT_SIZE, FIGMA_NODE_TYPES } from '../utils/constants.js';

export class FigmaComponentManager {
  constructor(figmaClient) {
    this.client = figmaClient;
  }

  /**
   * Create a component frame structure for an icon
   */
  createIconComponent(iconData, position = { x: 0, y: 0 }) {
    const { name, figmaVector } = iconData;
    
    const componentNode = {
      type: FIGMA_NODE_TYPES.COMPONENT,
      name: this.sanitizeComponentName(name),
      absoluteBoundingBox: {
        x: position.x,
        y: position.y,
        width: COMPONENT_SIZE,
        height: COMPONENT_SIZE
      },
      constraints: {
        horizontal: 'LEFT',
        vertical: 'TOP'
      },
      layoutConstraints: {
        horizontal: 'LEFT',
        vertical: 'TOP'
      },
      children: [
        this.createVectorNode(figmaVector, name)
      ],
      // Component properties for style variants
      componentPropertyDefinitions: {
        style: {
          type: 'VARIANT',
          defaultValue: 'filled',
          variantOptions: ['filled', 'outlined']
        }
      }
    };

    return componentNode;
  }

  /**
   * Create a vector node from SVG data
   */
  createVectorNode(figmaVector, iconName) {
    return {
      type: FIGMA_NODE_TYPES.VECTOR,
      name: iconName,
      absoluteBoundingBox: {
        x: 0,
        y: 0,
        width: COMPONENT_SIZE,
        height: COMPONENT_SIZE
      },
      constraints: {
        horizontal: 'SCALE',
        vertical: 'SCALE'
      },
      // Vector data - in a real implementation, this would need to be
      // converted from SVG path data to Figma's vector format
      vectorPaths: figmaVector.pathData.map(path => ({
        windingRule: 'NONZERO',
        data: path.d
      })),
      fills: [{
        type: 'SOLID',
        color: {
          r: 0,
          g: 0,
          b: 0,
          a: 1
        }
      }]
    };
  }

  /**
   * Create component variants for filled and outlined styles
   */
  createComponentWithVariants(iconName, filledSvg, outlinedSvg, position) {
    const componentSetNode = {
      type: 'COMPONENT_SET',
      name: this.sanitizeComponentName(iconName),
      absoluteBoundingBox: {
        x: position.x,
        y: position.y,
        width: COMPONENT_SIZE * 2 + 20, // Space for both variants
        height: COMPONENT_SIZE
      },
      children: [
        // Filled variant
        {
          ...this.createIconComponent({ 
            name: `${iconName}/filled`, 
            figmaVector: filledSvg 
          }, { x: 0, y: 0 }),
          name: 'Style=Filled'
        },
        // Outlined variant
        {
          ...this.createIconComponent({ 
            name: `${iconName}/outlined`, 
            figmaVector: outlinedSvg 
          }, { x: COMPONENT_SIZE + 20, y: 0 }),
          name: 'Style=Outlined'
        }
      ]
    };

    return componentSetNode;
  }

  /**
   * Create a category frame to organize icons
   */
  createCategoryFrame(categoryName, icons, startPosition = { x: 0, y: 0 }) {
    const iconsPerRow = 10;
    const spacing = COMPONENT_SIZE + 20;
    const components = [];

    let currentX = startPosition.x;
    let currentY = startPosition.y;

    icons.forEach((iconPair, index) => {
      if (index > 0 && index % iconsPerRow === 0) {
        currentX = startPosition.x;
        currentY += spacing;
      }

      const component = this.createComponentWithVariants(
        iconPair.name,
        iconPair.filled.figmaVector,
        iconPair.outlined.figmaVector,
        { x: currentX, y: currentY }
      );

      components.push(component);
      currentX += spacing * 2 + 20; // Account for variant width
    });

    // Calculate frame bounds to contain all components
    const frameWidth = Math.min(iconsPerRow, icons.length) * (spacing * 2 + 20);
    const frameHeight = Math.ceil(icons.length / iconsPerRow) * spacing;

    const categoryFrame = {
      type: FIGMA_NODE_TYPES.FRAME,
      name: this.sanitizeCategoryName(categoryName),
      absoluteBoundingBox: {
        x: startPosition.x - 20,
        y: startPosition.y - 20,
        width: frameWidth + 40,
        height: frameHeight + 40
      },
      backgroundColor: {
        r: 0.98,
        g: 0.98,
        b: 0.98,
        a: 1
      },
      children: components
    };

    return categoryFrame;
  }

  /**
   * Organize icons by category for Figma structure
   */
  organizeIconsForFigma(allIcons) {
    logger.info('Organizing icons for Figma component structure...');
    
    const organizedData = [];
    let currentY = 0;
    const categorySpacing = 100;

    for (const [categoryName, styles] of Object.entries(allIcons)) {
      if (!styles.filled || !styles.outlined) {
        logger.warn(`Skipping category ${categoryName}: missing filled or outlined style`);
        continue;
      }

      // Pair filled and outlined icons
      const iconPairs = this.pairIconStyles(styles.filled, styles.outlined);
      
      if (iconPairs.length === 0) {
        logger.warn(`Skipping category ${categoryName}: no matching icon pairs`);
        continue;
      }

      const categoryFrame = this.createCategoryFrame(
        categoryName,
        iconPairs,
        { x: 0, y: currentY }
      );

      organizedData.push(categoryFrame);
      currentY += categoryFrame.absoluteBoundingBox.height + categorySpacing;
    }

    logger.info(`Organized ${organizedData.length} categories for Figma`);
    return organizedData;
  }

  /**
   * Pair filled and outlined versions of the same icon
   */
  pairIconStyles(filledIcons, outlinedIcons) {
    const pairs = [];
    const outlinedMap = new Map(
      outlinedIcons.map(icon => [icon.name, icon])
    );

    for (const filledIcon of filledIcons) {
      const outlinedIcon = outlinedMap.get(filledIcon.name);
      if (outlinedIcon) {
        pairs.push({
          name: filledIcon.name,
          filled: filledIcon,
          outlined: outlinedIcon
        });
      } else {
        logger.debug(`No outlined version found for ${filledIcon.name}`);
      }
    }

    return pairs;
  }

  /**
   * Sanitize component names for Figma
   */
  sanitizeComponentName(name) {
    return name
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(\d)/, 'Icon $1'); // Ensure doesn't start with number
  }

  /**
   * Sanitize category names for Figma frames
   */
  sanitizeCategoryName(name) {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') + ' Icons';
  }

  /**
   * Generate Figma API payload for batch component creation
   */
  generateBatchPayload(organizedComponents) {
    return {
      node_changes: organizedComponents.map(component => ({
        node: component,
        action: 'CREATE'
      }))
    };
  }
} 