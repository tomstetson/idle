/**
 * Tests for system prompt constants and co-authored-by credits
 *
 * Verifies that baseSystemPrompt contains the MCP title tool instruction
 * and that coAuthoredCredits contains the correct attribution lines,
 * kept separate from the base prompt.
 */

import { describe, it, expect } from 'vitest';
import { baseSystemPrompt, coAuthoredCredits } from './systemPrompt';

describe('systemPrompt', () => {
  describe('baseSystemPrompt', () => {
    it('contains MCP title tool instruction', () => {
      expect(baseSystemPrompt).toContain('mcp__idle__change_title');
    });

    it('does not contain co-authored-by credits', () => {
      expect(baseSystemPrompt).not.toContain('Co-Authored-By');
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
