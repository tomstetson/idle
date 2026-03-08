/**
 * Tests for app system prompt and co-authored-by credits
 *
 * Verifies that the system prompt contains the options XML instruction
 * and that coAuthoredCredits contains the correct attribution lines.
 */

import { describe, it, expect } from 'vitest';
import { systemPrompt, coAuthoredCredits } from './systemPrompt';

describe('systemPrompt', () => {
  describe('systemPrompt constant', () => {
    it('contains options XML instruction', () => {
      expect(systemPrompt).toContain('<options>');
    });

    it('contains option element instruction', () => {
      expect(systemPrompt).toContain('<option>');
    });

    it('contains plan mode section', () => {
      expect(systemPrompt).toContain('Plan mode');
    });
  });

  describe('coAuthoredCredits', () => {
    it('contains Idle attribution', () => {
      expect(coAuthoredCredits).toContain('Co-Authored-By: Idle');
    });

    it('contains Claude attribution', () => {
      expect(coAuthoredCredits).toContain('Co-Authored-By: Claude');
    });

    it('contains Idle project link', () => {
      expect(coAuthoredCredits).toContain('https://northglass.io');
    });

    it('contains Claude Code link', () => {
      expect(coAuthoredCredits).toContain('https://claude.ai/code');
    });
  });
});
