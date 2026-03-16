/**
 * E2E tests for browser commands accessing public data.
 * These use OPENCLI_HEADLESS=1 to launch a headless Chromium.
 *
 * NOTE: These tests hit real websites in headless mode.
 * Some may fail due to bot detection / CAPTCHA / geo-blocking.
 * They are therefore marked as non-critical (allow failure in CI).
 */

import { describe, it, expect } from 'vitest';
import { runCli, parseJsonOutput } from './helpers.js';

/**
 * Helper to run a browser command and allow graceful failure.
 * Returns null if the command fails (bot detection, timeout, etc).
 */
async function tryBrowserCommand(args: string[]): Promise<any[] | null> {
  const { stdout, code } = await runCli(args, { timeout: 60_000 });
  if (code !== 0) return null;
  try {
    const data = parseJsonOutput(stdout);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

describe('browser public-data commands E2E', () => {
  // These tests verify that headless browser commands CAN work.
  // If the target site blocks headless browsers, the test is skipped rather than failed.

  it('v2ex hot returns topics (public API, no login)', async () => {
    const { stdout, code } = await runCli(['v2ex', 'hot', '--limit', '3', '-f', 'json']);
    expect(code).toBe(0);
    const data = parseJsonOutput(stdout);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0]).toHaveProperty('title');
  }, 30_000);

  it('v2ex latest returns topics', async () => {
    const { stdout, code } = await runCli(['v2ex', 'latest', '--limit', '3', '-f', 'json']);
    expect(code).toBe(0);
    const data = parseJsonOutput(stdout);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
  }, 30_000);

  // Browser-dependent public data: allow failure due to bot detection
  it.skipIf(process.env.CI === 'true')(
    'bilibili hot returns trending videos (may fail: bot detection)',
    async () => {
      const data = await tryBrowserCommand(['bilibili', 'hot', '--limit', '5', '-f', 'json']);
      if (data === null) {
        console.warn('bilibili hot: skipped — headless browser blocked or timed out');
        return;
      }
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(data[0]).toHaveProperty('title');
    },
    60_000,
  );

  it.skipIf(process.env.CI === 'true')(
    'zhihu hot returns trending questions (may fail: bot detection)',
    async () => {
      const data = await tryBrowserCommand(['zhihu', 'hot', '--limit', '5', '-f', 'json']);
      if (data === null) {
        console.warn('zhihu hot: skipped — headless browser blocked or timed out');
        return;
      }
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(data[0]).toHaveProperty('title');
    },
    60_000,
  );
});
