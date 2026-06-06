import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const PORT = 3001;

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to styling and mock assets
const ROOT_DIR = path.resolve(__dirname, '..');
const INDEX_CSS_PATH = path.join(ROOT_DIR, 'src', 'index.css');
const MOCK_ASSETS_PATH = path.join(ROOT_DIR, 'src', 'data', 'mockAssets.ts');

// Helper to parse mock assets from file
function getMockAssets(): any[] {
  try {
    const content = fs.readFileSync(MOCK_ASSETS_PATH, 'utf-8');
    // Simple regex parse to get items array from content
    const match = content.match(/export const mockAssets: Asset\[\] = \([\s\S]*?\)\[([\s\S]*?)\];/);
    const arrayStr = match ? match[1] : '';
    
    // We can evaluate it in a safe sandboxed manner or use a basic parsing strategy.
    // For simplicity and robust parsing, we will parse objects using structured extraction:
    const assets: any[] = [];
    const itemRegex = /\{([\s\S]*?)\}/g;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(arrayStr)) !== null) {
      const itemContent = itemMatch[1];
      const id = (itemContent.match(/id:\s*['"](.*?)['"]/) || [])[1];
      const name = (itemContent.match(/name:\s*['"](.*?)['"]/) || [])[1];
      const url = (itemContent.match(/url:\s*['"](.*?)['"]/) || [])[1];
      const type = (itemContent.match(/type:\s*['"](.*?)['"]/) || [])[1];
      const sizeStr = (itemContent.match(/size:\s*(\d+)/) || [])[1];
      const size = sizeStr ? parseInt(sizeStr, 10) : 100000;
      const ratingStr = (itemContent.match(/rating:\s*(\d+)/) || [])[1];
      const rating = ratingStr ? parseInt(ratingStr, 10) : 0;
      const starred = itemContent.includes('starred: true');
      const deleted = itemContent.includes('deleted: true');
      
      if (id && name) {
        assets.push({ id, name, url, type, size, rating, starred, deleted });
      }
    }
    return assets;
  } catch (err) {
    console.error("Failed to read mock assets:", err);
    return [];
  }
}

// Helper to update mock assets back to the file
function saveMockAssets(assets: any[]): boolean {
  try {
    let content = `import { Asset } from '../types';\n\nexport const mockAssets: Asset[] = [\n`;
    
    assets.forEach((asset, index) => {
      content += `  {\n`;
      content += `    id: '${asset.id}',\n`;
      content += `    name: '${asset.name}',\n`;
      content += `    url: '${asset.url || 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?auto=format&fit=crop&w=800&q=80'}',\n`;
      content += `    type: '${asset.type || 'image'}',\n`;
      content += `    width: ${asset.width || 800},\n`;
      content += `    height: ${asset.height || 600},\n`;
      content += `    size: ${asset.size || 150000},\n`;
      content += `    tags: ${JSON.stringify(asset.tags || ['imported'])},\n`;
      content += `    colors: ${JSON.stringify(asset.colors || ['#ffffff'])},\n`;
      content += `    dateAdded: '${asset.dateAdded || new Date().toISOString()}',\n`;
      content += `    starred: ${asset.starred ? 'true' : 'false'},\n`;
      content += `    deleted: ${asset.deleted ? 'true' : 'false'},\n`;
      if (asset.rating !== undefined) {
        content += `    rating: ${asset.rating},\n`;
      }
      content += `  }${index < assets.length - 1 ? ',' : ''}\n`;
    });
    
    content += `];\n`;
    fs.writeFileSync(MOCK_ASSETS_PATH, content, 'utf-8');
    return true;
  } catch (err) {
    console.error("Failed to save mock assets:", err);
    return false;
  }
}

// Helper to get accent color from CSS variables
function getAccentColor(): string {
  try {
    const css = fs.readFileSync(INDEX_CSS_PATH, 'utf-8');
    const match = css.match(/--color-accent:\s*(#[a-fA-F0-9]{3,8}|rgb\([^)]+\));/);
    return match ? match[1] : '#007AFF';
  } catch (err) {
    return '#007AFF';
  }
}

// Helper to update accent color in CSS
function updateAccentColor(newColor: string): boolean {
  try {
    let css = fs.readFileSync(INDEX_CSS_PATH, 'utf-8');
    const updated = css.replace(/--color-accent:\s*(#[a-fA-F0-9]{3,8}|rgb\([^)]+\));/, `--color-accent: ${newColor};`);
    fs.writeFileSync(INDEX_CSS_PATH, updated, 'utf-8');
    return true;
  } catch (err) {
    console.error("Failed to update CSS variables:", err);
    return false;
  }
}

// Generate Figma representation of layout trees
function generateFigmaLayout(): any {
  const accentColor = getAccentColor();
  const mockAssetsList = getMockAssets();
  
  // Design Tokens
  const tokens = {
    colors: {
      accent: accentColor,
      bgMain: '#161616',
      bgPanel: '#1c1c1e',
      border: '#27272a',
      textMain: '#e4e4e7',
      textMuted: '#71717a',
      white: '#ffffff',
      zinc50: '#fafafa',
      zinc100: '#f4f4f5',
      zinc200: '#e4e4e7',
      zinc300: '#d4d4d8',
      zinc400: '#a1a1aa',
      zinc500: '#71717a',
      zinc600: '#52525b',
      zinc700: '#3f3f46',
      zinc800: '#27272a',
      zinc900: '#18181b',
      zinc950: '#09090b'
    }
  };

  // Build simulated views
  const sidebarItems = [
    { type: 'TEXT', name: 'All Assets', text: '📁 All Assets', fontSize: 11, color: 'textMain', fontWeight: 'Medium' },
    { type: 'TEXT', name: 'Starred', text: '★ Starred', fontSize: 11, color: 'textMuted' },
    { type: 'TEXT', name: 'Recent', text: '🕒 Recent', fontSize: 11, color: 'textMuted' },
    { type: 'TEXT', name: 'Trash', text: '🗑 Trash', fontSize: 11, color: 'textMuted' },
    { type: 'TEXT', name: 'FOLDERS', text: 'FOLDERS', fontSize: 10, color: 'zinc500', fontWeight: 'Bold' },
    { type: 'TEXT', name: 'Design', text: '  📁 Design', fontSize: 11, color: 'textMuted' },
    { type: 'TEXT', name: 'Development', text: '  📁 Development', fontSize: 11, color: 'textMuted' },
    { type: 'TEXT', name: 'TAGS', text: 'TAGS', fontSize: 10, color: 'zinc500', fontWeight: 'Bold' },
    { type: 'TEXT', name: 'neon', text: '  🏷 neon', fontSize: 11, color: 'textMuted' },
    { type: 'TEXT', name: 'minimalist', text: '  🏷 minimalist', fontSize: 11, color: 'textMuted' },
    { type: 'TEXT', name: 'nature', text: '  🏷 nature', fontSize: 11, color: 'textMuted' }
  ];

  // Asset Cards in the Grid
  const assetCards = mockAssetsList.filter(a => !a.deleted).map(asset => {
    const sizeMB = (asset.size / (1024 * 1024)).toFixed(1);
    const starStr = '★'.repeat(asset.rating || 0) + '☆'.repeat(5 - (asset.rating || 0));
    return {
      type: 'FRAME',
      name: `AssetCard: ${asset.name}`,
      width: 180,
      height: 220,
      layoutMode: 'VERTICAL',
      padding: [10, 10],
      gap: 8,
      fill: 'zinc900',
      borderRadius: 8,
      children: [
        {
          type: 'FRAME',
          name: 'Preview',
          width: 160,
          height: 120,
          fillHex: asset.type === 'vector' ? '#ffcc00' : '#007AFF', // Simulated fill colors
          borderRadius: 4,
          layoutAlign: 'STRETCH'
        },
        {
          type: 'TEXT',
          name: 'Name',
          text: asset.name,
          fontSize: 11,
          fontWeight: 'Semi Bold',
          color: 'textMain'
        },
        {
          type: 'TEXT',
          name: 'Details',
          text: `${sizeMB}MB • ${asset.type.toUpperCase()}`,
          fontSize: 9,
          color: 'textMuted'
        },
        {
          type: 'TEXT',
          name: 'Rating',
          text: starStr,
          fontSize: 10,
          color: 'accent'
        }
      ]
    };
  });

  const appShell = {
    type: 'FRAME',
    name: '1. Library View',
    width: 1440,
    height: 900,
    layoutMode: 'HORIZONTAL',
    fill: 'bgPanel',
    children: [
      // Sidebar
      {
        type: 'FRAME',
        name: 'Sidebar',
        width: 240,
        height: 900,
        layoutMode: 'VERTICAL',
        padding: [24, 16],
        gap: 12,
        fill: 'bgMain',
        stroke: 'border',
        strokeWeight: 1,
        layoutAlign: 'STRETCH',
        children: [
          { type: 'TEXT', name: 'AppLogo', text: '✦ FALCON', fontSize: 14, fontWeight: 'Bold', color: 'accent' },
          ...sidebarItems
        ]
      },
      // Middle Column (Toolbar + Grid)
      {
        type: 'FRAME',
        name: 'WorkspaceContainer',
        layoutGrow: 1,
        height: 900,
        layoutMode: 'VERTICAL',
        layoutAlign: 'STRETCH',
        children: [
          // Toolbar
          {
            type: 'FRAME',
            name: 'Toolbar',
            layoutAlign: 'STRETCH',
            height: 56,
            layoutMode: 'HORIZONTAL',
            padding: [12, 16],
            gap: 16,
            fill: 'bgPanel',
            stroke: 'border',
            strokeWeight: 1,
            children: [
              { type: 'TEXT', name: 'NavArrows', text: '◀  ▶', fontSize: 12, color: 'textMuted' },
              { type: 'TEXT', name: 'FolderBadge', text: '📁 All Assets (10)', fontSize: 11, fontWeight: 'Semi Bold', color: 'textMain' },
              { type: 'FRAME', name: 'SearchField', layoutGrow: 1, height: 32, fill: 'zinc900', stroke: 'border', borderRadius: 6 },
              { type: 'TEXT', name: 'FilterBtn', text: '⚙ Filters', fontSize: 11, color: 'textMain' },
              { type: 'TEXT', name: 'SortBtn', text: '⇅ Sort', fontSize: 11, color: 'textMain' }
            ]
          },
          // Grid content
          {
            type: 'FRAME',
            name: 'AssetGrid',
            layoutAlign: 'STRETCH',
            layoutGrow: 1,
            layoutMode: 'VERTICAL',
            padding: [24, 24],
            gap: 24,
            children: [
              {
                type: 'FRAME',
                name: 'GridView',
                layoutAlign: 'STRETCH',
                layoutGrow: 1,
                layoutMode: 'HORIZONTAL',
                gap: 16,
                children: assetCards.slice(0, 4) // Show first 4 cards in Row 1
              },
              {
                type: 'FRAME',
                name: 'GridViewRow2',
                layoutAlign: 'STRETCH',
                layoutGrow: 1,
                layoutMode: 'HORIZONTAL',
                gap: 16,
                children: assetCards.slice(4, 8) // Show next 4 cards in Row 2
              }
            ]
          }
        ]
      },
      // Inspector
      {
        type: 'FRAME',
        name: 'Inspector',
        width: 320,
        height: 900,
        layoutMode: 'VERTICAL',
        padding: [24, 20],
        gap: 16,
        fill: 'bgMain',
        stroke: 'border',
        strokeWeight: 1,
        layoutAlign: 'STRETCH',
        children: [
          { type: 'TEXT', name: 'Title', text: 'Inspector', fontSize: 12, fontWeight: 'Semi Bold', color: 'textMain' },
          { type: 'FRAME', name: 'Thumbnail', width: 280, height: 180, fill: 'zinc900', borderRadius: 6 },
          { type: 'TEXT', name: 'FileName', text: 'neon_city_street.jpg', fontSize: 13, fontWeight: 'Bold', color: 'textMain' },
          { type: 'TEXT', name: 'Details', text: '6000 × 4000 • 4.5MB • JPEG', fontSize: 11, color: 'textMuted' },
          { type: 'TEXT', name: 'RatingLabel', text: 'Rating: ★★★★★', fontSize: 11, color: 'accent' },
          { type: 'TEXT', name: 'TagsSection', text: 'TAGS', fontSize: 10, color: 'zinc500', fontWeight: 'Bold' },
          { type: 'TEXT', name: 'TagsList', text: '#city  #neon  #night  #cyberpunk', fontSize: 11, color: 'textMain' }
        ]
      }
    ]
  };

  // View 2: Shortcut Overlay Modal View
  const shortcutOverlay = {
    type: 'FRAME',
    name: '2. Shortcut Overlay Page',
    width: 1440,
    height: 900,
    layoutMode: 'HORIZONTAL',
    fill: 'bgPanel',
    children: [
      // Simply recreate app shell layout, but with shortcut overlay centered on it
      {
        type: 'FRAME',
        name: 'OverlayBackground',
        layoutGrow: 1,
        height: 900,
        layoutMode: 'VERTICAL',
        padding: [150, 420],
        fill: 'bgMain',
        children: [
          {
            type: 'FRAME',
            name: 'ShortcutModal',
            width: 600,
            height: 480,
            layoutMode: 'VERTICAL',
            padding: [24, 24],
            gap: 16,
            fill: 'zinc950',
            stroke: 'border',
            strokeWeight: 1,
            borderRadius: 12,
            children: [
              { type: 'TEXT', name: 'Header', text: 'Keyboard Shortcuts', fontSize: 14, fontWeight: 'Bold', color: 'textMain' },
              { type: 'TEXT', name: 'Keys1', text: 'Space     -  Quick Look', fontSize: 12, color: 'textMain' },
              { type: 'TEXT', name: 'Keys2', text: '⌘A        -  Select All Assets', fontSize: 12, color: 'textMain' },
              { type: 'TEXT', name: 'Keys3', text: 'Backspace -  Move selection to trash', fontSize: 12, color: 'textMain' },
              { type: 'TEXT', name: 'Keys4', text: '⌘/        -  Show / hide sidebar', fontSize: 12, color: 'textMain' }
            ]
          }
        ]
      }
    ]
  };

  // View 3: Smart Folder Creator Page
  const smartFolderPage = {
    type: 'FRAME',
    name: '3. Smart Folder Creation Mode',
    width: 1440,
    height: 900,
    layoutMode: 'HORIZONTAL',
    fill: 'bgPanel',
    children: [
      {
        type: 'FRAME',
        name: 'OverlayBackground',
        layoutGrow: 1,
        height: 900,
        layoutMode: 'VERTICAL',
        padding: [200, 480],
        fill: 'bgMain',
        children: [
          {
            type: 'FRAME',
            name: 'SmartFolderModal',
            width: 480,
            height: 380,
            layoutMode: 'VERTICAL',
            padding: [20, 20],
            gap: 12,
            fill: 'zinc900',
            stroke: 'border',
            strokeWeight: 1,
            borderRadius: 10,
            children: [
              { type: 'TEXT', name: 'Title', text: 'New Smart Folder', fontSize: 13, fontWeight: 'Bold', color: 'textMain' },
              { type: 'FRAME', name: 'InputField', layoutAlign: 'STRETCH', height: 32, fill: 'zinc800', stroke: 'border', borderRadius: 4 },
              { type: 'TEXT', name: 'RuleHeader', text: 'Rules: Match ALL of the following:', fontSize: 11, color: 'textMuted' },
              { type: 'TEXT', name: 'Rule1', text: '• Tag  -  is  -  "cyberpunk"', fontSize: 11, color: 'textMain' },
              { type: 'TEXT', name: 'Rule2', text: '• Rating  -  is >=  -  "4"', fontSize: 11, color: 'textMain' },
              { type: 'TEXT', name: 'FooterActions', text: 'Cancel             [ Save Folder ]', fontSize: 11, fontWeight: 'Bold', color: 'accent' }
            ]
          }
        ]
      }
    ]
  };

  return {
    tokens,
    structure: [appShell, shortcutOverlay, smartFolderPage]
  };
}

// Start HTTP Server
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'online', service: 'falcon-figma-sync' }));
    return;
  }

  if (req.method === 'GET' && req.url === '/layout') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(generateFigmaLayout()));
    return;
  }

  if (req.method === 'POST' && req.url === '/layout') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const updatedFiles: string[] = [];

        console.log(`\n[Figma Sync] Received updates for frame: "${data.frameName}"`);
        
        // Scan for Design Tokens changed in Figma
        if (data.layout) {
          // If accent color variable is resolved
          let newAccentHex = '';
          
          const scanForAccent = (node: any) => {
            if (node.color === 'accent' && node.colorHex) {
              newAccentHex = node.colorHex;
            }
            if (node.fill === 'accent' && node.fillHex) {
              newAccentHex = node.fillHex;
            }
            if (node.children) {
              node.children.forEach(scanForAccent);
            }
          };
          scanForAccent(data.layout);

          if (newAccentHex) {
            console.log(`[Figma Sync] Accent Color variable modified to: ${newAccentHex}`);
            const ok = updateAccentColor(newAccentHex);
            if (ok) updatedFiles.push('src/index.css');
          }

          // Let's also check if an asset cards names got renamed or rating changed!
          const mockAssetsList = getMockAssets();
          let assetsUpdated = false;

          const scanForAssets = (node: any) => {
            if (node.name && node.name.startsWith('AssetCard: ')) {
              const originalName = node.name.replace('AssetCard: ', '').trim();
              // Find matching asset
              const asset = mockAssetsList.find(a => a.name === originalName);
              if (asset) {
                // Check if renamed
                const nameNode = node.children && node.children.find((c: any) => c.name === 'Name');
                if (nameNode && nameNode.text && nameNode.text !== asset.name) {
                  console.log(`[Figma Sync] Renamed asset "${asset.name}" to "${nameNode.text}"`);
                  asset.name = nameNode.text;
                  assetsUpdated = true;
                }

                // Check rating
                const ratingNode = node.children && node.children.find((c: any) => c.name === 'Rating');
                if (ratingNode && ratingNode.text) {
                  const starsCount = (ratingNode.text.match(/★/g) || []).length;
                  if (starsCount !== asset.rating) {
                    console.log(`[Figma Sync] Updated rating for "${asset.name}" to ${starsCount} stars`);
                    asset.rating = starsCount;
                    assetsUpdated = true;
                  }
                }
              }
            }
            if (node.children) {
              node.children.forEach(scanForAssets);
            }
          };
          scanForAssets(data.layout);

          if (assetsUpdated) {
            const ok = saveMockAssets(mockAssetsList);
            if (ok) updatedFiles.push('src/data/mockAssets.ts');
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          updatedFiles
        }));
      } catch (err: any) {
        console.error("Error handling POST layout:", err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Internal Server Error: ${err.message}`);
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`Falcon Figma 2-Way Sync server running on port ${PORT}`);
  console.log(`Endpoints available:`);
  console.log(` - GET  http://localhost:${PORT}/layout   (fetch design)`);
  console.log(` - POST http://localhost:${PORT}/layout   (push changes)`);
  console.log(`===================================================`);
});
