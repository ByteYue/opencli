/**
 * E2E tests for public API commands (no browser required).
 * These commands use Node.js fetch directly, so they work in any CI environment.
 */

import { describe, it, expect } from 'vitest';
import { runCli, parseJsonOutput } from './helpers.js';

describe('public commands E2E', () => {
  it('hackernews top returns structured data', async () => {
    const { stdout, code } = await runCli(['hackernews', 'top', '--limit', '3', '-f', 'json']);
    expect(code).toBe(0);
    const data = parseJsonOutput(stdout);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(3);
    expect(data[0]).toHaveProperty('title');
    expect(data[0]).toHaveProperty('score');
    expect(data[0]).toHaveProperty('rank');
  }, 30_000);

  it('bbc news returns headlines', async () => {
    const { stdout, code } = await runCli(['bbc', 'news', '--limit', '3', '-f', 'json']);
    expect(code).toBe(0);
    const data = parseJsonOutput(stdout);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0]).toHaveProperty('title');
  }, 30_000);

  it('github search returns repos', async () => {
    const { stdout, code } = await runCli(['github', 'search', '--keyword', 'playwright', '--limit', '3', '-f', 'json']);
    expect(code).toBe(0);
    const data = parseJsonOutput(stdout);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0]).toHaveProperty('title');
  }, 30_000);
});
