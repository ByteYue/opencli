/**
 * Smoke tests for external API health.
 * Only run on schedule or manual dispatch — NOT on every push/PR.
 * These verify that external APIs haven't changed their structure.
 */

import { describe, it, expect } from 'vitest';
import { runCli, parseJsonOutput } from '../e2e/helpers.js';

describe('API health smoke tests', () => {
  it('hackernews API is responsive and returns expected structure', async () => {
    const { stdout, code } = await runCli(['hackernews', 'top', '--limit', '5', '-f', 'json']);
    expect(code).toBe(0);
    const data = parseJsonOutput(stdout);
    expect(data.length).toBe(5);
    // Verify all expected fields exist
    for (const item of data) {
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('score');
      expect(item).toHaveProperty('author');
      expect(item).toHaveProperty('rank');
    }
  }, 30_000);

  it('bbc news RSS is responsive', async () => {
    const { stdout, code } = await runCli(['bbc', 'news', '--limit', '5', '-f', 'json']);
    expect(code).toBe(0);
    const data = parseJsonOutput(stdout);
    expect(data.length).toBeGreaterThanOrEqual(1);
    for (const item of data) {
      expect(item).toHaveProperty('title');
    }
  }, 30_000);

  it('v2ex latest API is responsive', async () => {
    const { stdout, code } = await runCli(['v2ex', 'latest', '--limit', '3', '-f', 'json']);
    expect(code).toBe(0);
    const data = parseJsonOutput(stdout);
    expect(data.length).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('v2ex public API is responsive', async () => {
    const { stdout, code } = await runCli(['v2ex', 'hot', '--limit', '3', '-f', 'json']);
    expect(code).toBe(0);
    const data = parseJsonOutput(stdout);
    expect(data.length).toBeGreaterThanOrEqual(1);
  }, 30_000);
});
