import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
// Serve the app and its assets directly from the Firebase Hosting root.
rmSync(`${dist}/firebase`, { recursive: true, force: true });
mkdirSync(`${dist}/firebase`, { recursive: true });
cpSync(`${dist}/client`, `${dist}/firebase`, { recursive: true });
console.log('Prepared Firebase Hosting build: dist/firebase');
