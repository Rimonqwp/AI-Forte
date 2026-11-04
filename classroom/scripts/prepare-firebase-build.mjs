import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
// Keep Vite's established /static/classroom/ asset URLs on Firebase Hosting.
rmSync(`${dist}/firebase`, { recursive: true, force: true });
mkdirSync(`${dist}/firebase/static`, { recursive: true });
cpSync(`${dist}/client`, `${dist}/firebase/static/classroom`, { recursive: true });
cpSync(`${dist}/client/index.html`, `${dist}/firebase/index.html`);
console.log('Prepared Firebase Hosting build: dist/firebase');
