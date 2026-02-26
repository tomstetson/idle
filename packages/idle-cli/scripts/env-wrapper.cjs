#!/usr/bin/env node
/**
 * Cross-platform environment wrapper for idle CLI
 * Sets IDLE_HOME_DIR and provides visual feedback
 *
 * Usage: node scripts/env-wrapper.js <variant> <command> [...args]
 *
 * Variants:
 *   - stable: Production-ready version using ~/.idle/
 *   - dev: Development version using ~/.idle-dev/
 *
 * Examples:
 *   node scripts/env-wrapper.js stable daemon start
 *   node scripts/env-wrapper.js dev auth login
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const VARIANTS = {
  stable: {
    homeDir: path.join(os.homedir(), '.idle'),
    color: '\x1b[32m', // Green
    label: '✅ STABLE',
    serverUrl: process.env.IDLE_SERVER_URL || 'https://api.idle.northglass.io'
  },
  dev: {
    homeDir: path.join(os.homedir(), '.idle-dev'),
    color: '\x1b[33m', // Yellow
    label: '🔧 DEV',
    serverUrl: process.env.IDLE_SERVER_URL || 'https://api.idle.northglass.io'
  }
};

const variant = process.argv[2];
const command = process.argv[3];
const args = process.argv.slice(4);

if (!variant || !VARIANTS[variant]) {
  console.error('Usage: node scripts/env-wrapper.js <stable|dev> <command> [...args]');
  console.error('');
  console.error('Variants:');
  console.error('  stable - Production-ready version (data: ~/.idle/)');
  console.error('  dev    - Development version (data: ~/.idle-dev/)');
  console.error('');
  console.error('Examples:');
  console.error('  node scripts/env-wrapper.js stable daemon start');
  console.error('  node scripts/env-wrapper.js dev auth login');
  process.exit(1);
}

const config = VARIANTS[variant];

// Create home directory if it doesn't exist
if (!fs.existsSync(config.homeDir)) {
  fs.mkdirSync(config.homeDir, { recursive: true });
}

// Visual feedback
console.log(`${config.color}${config.label}\x1b[0m Idle CLI (data: ${config.homeDir})`);

// Set environment and execute command
const env = {
  ...process.env,
  IDLE_HOME_DIR: config.homeDir,
  IDLE_SERVER_URL: config.serverUrl,
  IDLE_VARIANT: variant, // For internal validation
};

const binPath = path.join(__dirname, '..', 'bin', 'idle.mjs');
const proc = spawn('node', [binPath, command, ...args], {
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

proc.on('exit', (code) => process.exit(code || 0));
