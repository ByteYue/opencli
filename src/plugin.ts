/**
 * Plugin management: install, uninstall, and list plugins.
 *
 * Plugins live in ~/.opencli/plugins/<name>/.
 * Install source format: "github:user/repo"
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { PLUGINS_DIR } from './discovery.js';
import { log } from './logger.js';

export interface PluginInfo {
  name: string;
  path: string;
  commands: string[];
  source?: string;
}

/**
 * Install a plugin from a source.
 * Currently supports "github:user/repo" format (git clone wrapper).
 */
export function installPlugin(source: string): void {
  const parsed = parseSource(source);
  if (!parsed) {
    throw new Error(
      `Invalid plugin source: "${source}"\n` +
      `Supported formats:\n` +
      `  github:user/repo\n` +
      `  https://github.com/user/repo`
    );
  }

  const { cloneUrl, name } = parsed;
  const targetDir = path.join(PLUGINS_DIR, name);

  if (fs.existsSync(targetDir)) {
    throw new Error(`Plugin "${name}" is already installed at ${targetDir}`);
  }

  // Ensure plugins directory exists
  fs.mkdirSync(PLUGINS_DIR, { recursive: true });

  try {
    execSync(`git clone --depth 1 ${cloneUrl} ${targetDir}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err: any) {
    throw new Error(`Failed to clone plugin: ${err.message}`);
  }

  // If the plugin has a package.json, run npm install for peerDeps resolution
  const pkgJsonPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      execSync('npm install --production', {
        cwd: targetDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      // Non-fatal: npm install may fail if no real deps
    }
  }
}

/**
 * Uninstall a plugin by name.
 */
export function uninstallPlugin(name: string): void {
  const targetDir = path.join(PLUGINS_DIR, name);
  if (!fs.existsSync(targetDir)) {
    throw new Error(`Plugin "${name}" is not installed.`);
  }
  fs.rmSync(targetDir, { recursive: true, force: true });
}

/**
 * List all installed plugins.
 */
export function listPlugins(): PluginInfo[] {
  if (!fs.existsSync(PLUGINS_DIR)) return [];

  const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });
  const plugins: PluginInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pluginDir = path.join(PLUGINS_DIR, entry.name);
    const commands = scanPluginCommands(pluginDir);
    const source = getPluginSource(pluginDir);

    plugins.push({
      name: entry.name,
      path: pluginDir,
      commands,
      source,
    });
  }

  return plugins;
}

/** Scan a plugin directory for command files */
function scanPluginCommands(dir: string): string[] {
  try {
    const files = fs.readdirSync(dir);
    return files
      .filter(f =>
        f.endsWith('.yaml') || f.endsWith('.yml') ||
        (f.endsWith('.ts') && !f.endsWith('.d.ts') && !f.endsWith('.test.ts')) ||
        (f.endsWith('.js') && !f.endsWith('.d.js'))
      )
      .map(f => path.basename(f, path.extname(f)));
  } catch {
    return [];
  }
}

/** Get git remote origin URL */
function getPluginSource(dir: string): string | undefined {
  try {
    return execSync('git config --get remote.origin.url', {
      cwd: dir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return undefined;
  }
}

/** Parse a plugin source string into clone URL and name */
function parseSource(source: string): { cloneUrl: string; name: string } | null {
  // github:user/repo
  const githubMatch = source.match(/^github:(.+?)\/(.+?)$/);
  if (githubMatch) {
    const [, user, repo] = githubMatch;
    const name = repo.replace(/^opencli-plugin-/, '');
    return {
      cloneUrl: `https://github.com/${user}/${repo}.git`,
      name,
    };
  }

  // https://github.com/user/repo (or .git)
  const urlMatch = source.match(/^https?:\/\/github\.com\/(.+?)\/(.+?)(?:\.git)?$/);
  if (urlMatch) {
    const [, user, repo] = urlMatch;
    const name = repo.replace(/^opencli-plugin-/, '');
    return {
      cloneUrl: `https://github.com/${user}/${repo}.git`,
      name,
    };
  }

  return null;
}

export { parseSource as _parseSource };
