import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
	server: {
		host: "::",
		port: 8080,
	},
	plugins: [react()].filter(Boolean),
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "."),
		},
		dedupe: ['react', 'react-dom'],
	},
	build: {
		rollupOptions: {
			// Tradly SDK references internal @tradly/* sub-packages not bundled in node_modules
			external: (id) => id.startsWith("@tradly/"),
		},
	},
}));

