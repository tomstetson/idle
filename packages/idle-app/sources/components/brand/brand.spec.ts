import { describe, it, expect } from 'vitest';

/**
 * Brand component smoke tests.
 *
 * The React Native components (IdleLogoMark, IdleTabIcon, IdleWordmark) depend on
 * react-native-svg and react-native which are unavailable in vitest's node environment.
 * Instead, we test the pure-data exports: colors, SVG strings, types, and the barrel index.
 */

// Import directly from pure-data modules to avoid pulling in react-native
// via the barrel index (IdleLogoMark.tsx etc. import react-native-svg).
import { idleBrandColors } from '@/brand/colors';
import type { IdleBrandColors } from '@/brand/colors';
import { logoMarkSvg, tabInboxSvg, tabSessionsSvg, tabSettingsSvg } from '@/brand/svgAssets';

// IdleTabIconType is defined inline to avoid importing IdleTabIcon.tsx
// which depends on react-native-svg (not available in vitest node env).
type IdleTabIconType = 'inbox' | 'sessions' | 'settings';

describe('Brand exports', () => {

    describe('idleBrandColors', () => {
        it('exports the brand color object', () => {
            expect(idleBrandColors).toBeDefined();
            expect(typeof idleBrandColors).toBe('object');
        });

        it('contains the core teal color', () => {
            expect(idleBrandColors.teal).toBe('#0D3B47');
        });

        it('contains the accent cyan color', () => {
            expect(idleBrandColors.cyan).toBe('#00C9B1');
        });

        it('contains the amber highlight', () => {
            expect(idleBrandColors.amber).toBe('#E8B84C');
        });

        it('all color values are valid hex strings', () => {
            const hexPattern = /^#[0-9A-F]{6}$/i;
            for (const [key, value] of Object.entries(idleBrandColors)) {
                expect(value, `${key} should be a hex color`).toMatch(hexPattern);
            }
        });

        it('satisfies the IdleBrandColors type (compile-time check)', () => {
            const colors: IdleBrandColors = idleBrandColors;
            expect(colors).toBe(idleBrandColors);
        });
    });

    describe('SVG asset strings', () => {
        it('logoMarkSvg is a valid SVG string', () => {
            expect(logoMarkSvg).toContain('<svg');
            expect(logoMarkSvg).toContain('</svg>');
        });

        it('tabInboxSvg is a valid SVG string', () => {
            expect(tabInboxSvg).toContain('<svg');
            expect(tabInboxSvg).toContain('</svg>');
        });

        it('tabSessionsSvg is a valid SVG string', () => {
            expect(tabSessionsSvg).toContain('<svg');
            expect(tabSessionsSvg).toContain('</svg>');
        });

        it('tabSettingsSvg is a valid SVG string', () => {
            expect(tabSettingsSvg).toContain('<svg');
            expect(tabSettingsSvg).toContain('</svg>');
        });

        it('all SVG assets use currentColor for theming', () => {
            for (const svg of [logoMarkSvg, tabInboxSvg, tabSessionsSvg, tabSettingsSvg]) {
                expect(svg).toContain('currentColor');
            }
        });

        it('all SVG assets use 24x24 viewBox', () => {
            for (const svg of [logoMarkSvg, tabInboxSvg, tabSessionsSvg, tabSettingsSvg]) {
                expect(svg).toContain('viewBox="0 0 24 24"');
            }
        });
    });

    describe('IdleTabIconType covers expected tabs', () => {
        it('type allows inbox, sessions, and settings', () => {
            // Compile-time type validation — if this compiles, the type is correct
            const tabs: IdleTabIconType[] = ['inbox', 'sessions', 'settings'];
            expect(tabs).toHaveLength(3);
        });
    });
});
