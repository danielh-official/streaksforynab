import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function normalizeBasePath(path: string) {
	if (!path) return '/';

	// Ensure a leading slash is present
	let normalized = path.startsWith('/') ? path : `/${path}`;

	// Remove trailing slash (except for root) so we can control joining later
	if (normalized !== '/' && normalized.endsWith('/')) {
		normalized = normalized.slice(0, -1);
	}

	return normalized;
}

// Get the base path from environment or use default
const PUBLIC_BASE_PATH = normalizeBasePath(process.env.PUBLIC_BASE_PATH || '/');
const ASSETS_PREFIX = PUBLIC_BASE_PATH === '/' ? '/' : `${PUBLIC_BASE_PATH}/`;

// Create manifest (replicated from src/manifest.ts)
function createManifest() {
	return {
		short_name: 'Streaks (For YNAB)',
		name: 'Streaks (For YNAB)',
		start_url: PUBLIC_BASE_PATH,
		background_color: '#ffffff',
		display: 'standalone',
		scope: PUBLIC_BASE_PATH,
		theme_color: '#000000',
		description: 'A web app to track your spending habits with YNAB.',
		icons: [
			{
				src: `${ASSETS_PREFIX}icons/dollar.png`,
				sizes: '192x192',
				type: 'image/png'
			},
			{
				src: `${ASSETS_PREFIX}icons/dollar.png`,
				sizes: '512x512',
				type: 'image/png'
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
