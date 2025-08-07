# Figma Material Sync

Automate the synchronization of Google Material Icons into a Figma component library.

## Architecture Overview

### Project Structure
```
figma-material-sync/
├── index.js                 # Main entry point and orchestrator
├── src/                     # Source code modules
│   ├── fetchers/           # Data fetching modules
│   │   ├── materialIcons.js # Fetch icons from GitHub
│   │   └── iconMetadata.js  # Parse icon categories/metadata
│   ├── processors/         # Data processing modules
│   │   ├── svgCleaner.js   # Clean and normalize SVGs
│   │   └── iconOrganizer.js # Organize icons by category
│   ├── figma/             # Figma API integration
│   │   ├── client.js      # Figma REST API client
│   │   ├── components.js  # Component creation logic
│   │   └── library.js     # Library management
│   └── utils/             # Utility functions
│       ├── logger.js      # Logging utilities
│       └── constants.js   # Project constants
├── temp/                  # Temporary files (gitignored)
├── .env                   # Environment variables
├── .gitignore            # Git ignore patterns
└── package.json          # Dependencies and scripts
```

### Module Responsibilities

**Core Modules:**
- `index.js`: Main orchestrator that coordinates the sync process
- `src/fetchers/materialIcons.js`: Downloads SVG files from Material Icons GitHub repo
- `src/processors/svgCleaner.js`: Cleans SVGs (removes metadata, normalizes viewBox)
- `src/figma/client.js`: Handles Figma REST API authentication and requests
- `src/figma/components.js`: Creates components with style variants (Filled/Outlined)

**Data Flow:**
1. Fetch icon metadata and SVG files from Google Material Icons GitHub
2. Filter for Filled and Outlined styles only
3. Clean and normalize SVG content
4. Organize icons by Material Design categories
5. Authenticate with Figma REST API
6. Create/update Figma file with organized components
7. Set up component variants for style switching

## Features

- ✅ Fetches only Filled and Outlined Material Icons
- ✅ Organizes icons by Material Design categories
- ✅ Creates 24x24px components with style variants
- ✅ Automatic SVG cleaning and optimization
- ✅ Incremental updates (only sync changed icons)
- ✅ Extensible for custom icons

## Environment Variables

```bash
FIGMA_ACCESS_TOKEN=your_figma_access_token
FIGMA_FILE_KEY=your_figma_file_key  # Optional: creates new file if not provided
```

## Usage

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Figma access token

# Run the sync
npm run sync

# Run with verbose logging
npm run sync:verbose
```

## API Requirements

- **Figma Access Token**: Personal access token with write permissions
- **GitHub API**: Rate-limited public access (no token required)


