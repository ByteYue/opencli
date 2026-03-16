/**
 * E2E tests for management commands (list, validate, doctor).
 * These commands require no external network access.
 */

import { describe, it, expect } from 'vitest';
import { runCli, parseJsonOutput } from './helpers.js';

describe('management commands E2E', () => {
  it('list shows all registered commands', async () => {
    const { stdout, code } = await runCli(['list', '-f', 'json']);
    expect(code).toBe(0);
    const data = parseJsonOutput(stdout);
    expect(Array.isArray(data)).toBe(true);
    // Should have 50+ commands across 18 sites
    expect(data.length).toBeGreaterThan(50);
    // Each entry should have the standard fields
    expect(data[0]).toHaveProperty('command');
    expect(data[0]).toHaveProperty('site');
    expect(data[0]).toHaveProperty('name');
    expect(data[0]).toHaveProperty('strategy');
  });

  it('list supports yaml format', async () => {
    const { stdout, code } = await runCli(['list', '-f', 'yaml']);
    expect(code).toBe(0);
    expect(stdout).toContain('command:');
    expect(stdout).toContain('site:');
  });

  it('validate passes for all built-in adapters', async () => {
    const { stdout, code } = await runCli(['validate']);
    expect(code).toBe(0);
    expect(stdout).toContain('PASS');
    expect(stdout).not.toContain('❌');
  });

  it('validate works for specific site', async () => {
    const { stdout, code } = await runCli(['validate', 'hackernews']);
    expect(code).toBe(0);
    expect(stdout).toContain('PASS');
  });
});
