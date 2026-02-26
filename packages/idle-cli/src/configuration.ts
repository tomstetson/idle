/**
 * Global configuration for idle CLI
 * 
 * Centralizes all configuration including environment variables and paths
 * Environment files should be loaded using Node's --env-file flag
 */

import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import packageJson from '../package.json'

class Configuration {
  public readonly serverUrl: string
  public readonly webappUrl: string
  public readonly isDaemonProcess: boolean

  // Directories and paths (from persistence)
  public readonly idleHomeDir: string
  public readonly logsDir: string
  public readonly settingsFile: string
  public readonly privateKeyFile: string
  public readonly daemonStateFile: string
  public readonly daemonLockFile: string
  public readonly currentCliVersion: string

  public readonly isExperimentalEnabled: boolean
  public readonly disableCaffeinate: boolean

  constructor() {
    // Server configuration - priority: parameter > environment > default
    this.serverUrl = process.env.IDLE_SERVER_URL || 'https://api.idle.northglass.io'
    this.webappUrl = process.env.IDLE_WEBAPP_URL || 'https://idle.northglass.io'

    // Check if we're running as daemon based on process args
    const args = process.argv.slice(2)
    this.isDaemonProcess = args.length >= 2 && args[0] === 'daemon' && (args[1] === 'start-sync')

    // Directory configuration - Priority: IDLE_HOME_DIR env > default home dir
    if (process.env.IDLE_HOME_DIR) {
      // Expand ~ to home directory if present
      const expandedPath = process.env.IDLE_HOME_DIR.replace(/^~/, homedir())
      this.idleHomeDir = expandedPath
    } else {
      this.idleHomeDir = join(homedir(), '.idle')
    }

    this.logsDir = join(this.idleHomeDir, 'logs')
    this.settingsFile = join(this.idleHomeDir, 'settings.json')
    this.privateKeyFile = join(this.idleHomeDir, 'access.key')
    this.daemonStateFile = join(this.idleHomeDir, 'daemon.state.json')
    this.daemonLockFile = join(this.idleHomeDir, 'daemon.state.json.lock')

    this.isExperimentalEnabled = ['true', '1', 'yes'].includes(process.env.IDLE_EXPERIMENTAL?.toLowerCase() || '');
    this.disableCaffeinate = ['true', '1', 'yes'].includes(process.env.IDLE_DISABLE_CAFFEINATE?.toLowerCase() || '');

    this.currentCliVersion = packageJson.version

    // Validate variant configuration
    const variant = process.env.IDLE_VARIANT || 'stable'
    if (variant === 'dev' && !this.idleHomeDir.includes('dev')) {
      console.warn('⚠️  WARNING: IDLE_VARIANT=dev but IDLE_HOME_DIR does not contain "dev"')
      console.warn(`   Current: ${this.idleHomeDir}`)
      console.warn(`   Expected: Should contain "dev" (e.g., ~/.idle-dev)`)
    }

    // Visual indicator on CLI startup (only if not daemon process to avoid log clutter)
    if (!this.isDaemonProcess && variant === 'dev') {
      console.log('\x1b[33m🔧 DEV MODE\x1b[0m - Data: ' + this.idleHomeDir)
    }

    if (!existsSync(this.idleHomeDir)) {
      mkdirSync(this.idleHomeDir, { recursive: true })
    }
    // Ensure directories exist
    if (!existsSync(this.logsDir)) {
      mkdirSync(this.logsDir, { recursive: true })
    }
  }
}

export const configuration: Configuration = new Configuration()
