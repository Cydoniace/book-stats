import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' — сайт работает из любой папки, в том числе https://<логин>.github.io/<репозиторий>/
export default defineConfig({ plugins: [react()], base: './', build: { chunkSizeWarningLimit: 800 } });
