import staticAdapter from '@sveltejs/adapter-static';
import autoAdapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import dotenv from 'dotenv';

dotenv.config();

function getAdapter() {
	const selectedAdapter = process.env.ADAPTER || 'static';

	console.log('The current selected adapter is:', selectedAdapter);

	if (selectedAdapter === 'auto') {
		return autoAdapter();
	}

	return staticAdapter({
		pages: 'build',
		assets: 'build',
		fallback: 'fallback.html',
		precompress: false,
		strict: true
	});
}

function getBasePath() {
	return process.env.PUBLIC_BASE_PATH || '';
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: getAdapter(),
		paths: {
			base: getBasePath()
		},
		csp: {
			directives: {
				'img-src': ["'self'", 'data:', 'https://images.unsplash.com', 'https://cdn.sanity.io']
			}
		},
		csrf: {
			trustedOrigins: [process.env.BASE_PATH || '']
		}
	}
};

export default config;
