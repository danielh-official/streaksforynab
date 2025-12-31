import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the base path from environment or use default
const PUBLIC_BASE_PATH = process.env.PUBLIC_BASE_PATH || '/';

// Create manifest (replicated from src/manifest.ts)
function createManifest() {
    return {
        "short_name": "Streaks (For YNAB)",
        "name": "Streaks (For YNAB)",
        "start_url": PUBLIC_BASE_PATH,
        "background_color": "#ffffff",
        "display": "standalone",
        "scope": PUBLIC_BASE_PATH,
        "theme_color": "#000000",
        "description": "A web app to track your spending habits with YNAB.",
        "icons": [
            {
                "src": `${PUBLIC_BASE_PATH}icons/dollar.png`,
                "sizes": "192x192",
                "type": "image/png"
            },
            {
                "src": `${PUBLIC_BASE_PATH}icons/dollar.png`,
                "sizes": "512x512",
                "type": "image/png"
            }
        ]
    };
}

// Generate the manifest
const manifest = createManifest();

// Write to static/manifest.json
const manifestPath = join(__dirname, '../static/manifest.json');
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log('✅ Generated static/manifest.json');
