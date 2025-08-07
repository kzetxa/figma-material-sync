# Setup Instructions

## Getting Your API Tokens

### Figma API Token (Required)

1. **Sign in to Figma** and go to your [Settings page](https://www.figma.com/settings)
2. Scroll down to **Personal access tokens** section
3. Click **Create a new personal access token**
4. Give it a descriptive name (e.g., "Material Icons Sync")
5. Copy the generated token (starts with `figd_`)

### GitHub Token (Optional, Recommended)

1. **Sign in to GitHub** and go to [Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Give it a descriptive name (e.g., "Material Icons Sync")
4. Select **public_repo** scope (for public repository access)
5. Copy the generated token

**Note**: Without a GitHub token, you'll be limited to 60 requests/hour. With a token, you get 5,000 requests/hour.

## Setting Up the Environment

1. **Create your .env file**:
   ```bash
   cp .env.example .env
   ```
   
   If `.env.example` doesn't exist, create `.env` manually:
   ```bash
   # Figma API Configuration
   FIGMA_ACCESS_TOKEN=your_figma_personal_access_token_here
   
   # Optional: Specify existing Figma file key to update
   FIGMA_FILE_KEY=
   
   # Optional: GitHub token for higher API rate limits
   # Create at: https://github.com/settings/tokens
   GITHUB_TOKEN=your_github_personal_access_token_here
   
   # Logging level (optional)
   LOG_LEVEL=info
   ```

2. **Edit the .env file** and replace `your_figma_personal_access_token_here` with your actual token

3. **Optional: Set up a target Figma file**:
   - Create a new Figma file in your workspace
   - Copy the file key from the URL (e.g., `figma.com/file/ABC123DEF456/...` → the key is `ABC123DEF456`)
   - Add it to your `.env` file: `FIGMA_FILE_KEY=ABC123DEF456`

## Running the Sync

### First Run (Test Connection)
```bash
# Install dependencies if not already done
npm install

# Test the sync (dry run)
npm run sync
```

### With Verbose Logging
```bash
npm run sync:verbose
```

### CLI Options
```bash
# Show help
node index.js --help

# Show version
node index.js --version
```

## Expected Output

When running successfully, you should see:
```
🚀 Starting Material Icons sync to Figma...
📡 Testing Figma API connection...
Connected to Figma as: your@email.com
📦 Fetching Material Icons from GitHub...
📊 Downloaded ~2000+ icons across 17 categories
🔧 Processing SVG icons for Figma compatibility...
🏗️ Organizing icons for Figma component structure...
🎨 Syncing to Figma...
📝 Structure summary saved to temp/figma-structure.json
💾 Figma import payload saved to temp/figma-payload.json
✅ Sync completed successfully
```

## Understanding the Output Files

After running, check the `temp/` directory:

- **`figma-structure.json`**: Summary of organized icon categories
- **`figma-payload.json`**: Complete Figma API payload (for plugin development)
- **`icons/`**: Downloaded SVG files organized by category and style

## Current Limitations & Next Steps

### What This MVP Accomplishes:
✅ Downloads all Material Icons (Filled + Outlined only)
✅ Cleans and processes SVGs for Figma compatibility  
✅ Organizes icons by Material Design categories
✅ Generates proper component structure with variants
✅ Prepares Figma-ready payload data

### Current API Limitations:
⚠️ **Direct component creation via REST API is limited**
⚠️ The Figma REST API doesn't support full node creation

### Recommended Next Steps:

1. **For Manual Import** (Immediate):
   - Use the generated SVG files in `temp/icons/`
   - Import them manually into your Figma file
   - Set up component variants based on the structure in `figma-structure.json`

2. **For Full Automation** (Advanced):
   - Develop a Figma plugin using the generated payload
   - Use Figma's Plugin API which has full node creation capabilities
   - The plugin would read `figma-payload.json` and create components directly

3. **For Incremental Updates**:
   - Modify the code to track changes and only sync updated icons
   - Add timestamp tracking to avoid re-downloading unchanged files

## Troubleshooting

### "Missing required environment variables"
- Ensure your `.env` file exists and contains `FIGMA_ACCESS_TOKEN`

### "Invalid Figma access token"
- Check that your token is correct and hasn't expired
- Ensure your token has the necessary permissions

### "Figma file not found"
- Verify the `FIGMA_FILE_KEY` is correct
- Ensure you have access to the file

### Network/Download Issues
- The script includes retry logic for network failures
- Check your internet connection if downloads consistently fail

## Development Notes

### Project Structure
- `src/fetchers/`: GitHub API integration
- `src/processors/`: SVG cleaning and normalization  
- `src/figma/`: Figma API client and component management
- `src/utils/`: Logging and constants
- `temp/`: Generated files and downloads

### Extending the System
- Add custom icon sources in `src/fetchers/`
- Modify SVG processing in `src/processors/svgCleaner.js`
- Customize Figma component structure in `src/figma/components.js`

### Performance Considerations
- The initial sync downloads ~2000+ icons and may take several minutes
- Subsequent runs could be optimized with caching
- Consider running during off-peak hours for large syncs 