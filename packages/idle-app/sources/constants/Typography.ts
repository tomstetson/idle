import { Platform } from 'react-native';

/**
 * Typography system for Idle Coder app
 *
 * Default typography: Inter
 * Monospace typography: JetBrains Mono
 * Heading typography: Space Grotesk (headings and branding)
 *
 * Usage Examples:
 *
 * // Default typography (Inter)
 * <Text style={{ fontSize: 16, ...Typography.default() }}>Regular text</Text>
 * <Text style={{ fontSize: 16, ...Typography.default('medium') }}>Medium text</Text>
 *
 * // Monospace typography (JetBrains Mono)
 * <Text style={{ fontSize: 14, ...Typography.mono() }}>Code text</Text>
 * <Text style={{ fontSize: 14, ...Typography.mono('medium') }}>Medium code</Text>
 *
 * // Heading typography (Space Grotesk)
 * <Text style={{ fontSize: 28, ...Typography.heading() }}>Heading Text</Text>
 *
 * // Alternative direct usage
 * <Text style={{ fontSize: 16, fontFamily: getDefaultFont('medium') }}>Direct usage</Text>
 * <Text style={{ fontSize: 14, fontFamily: getMonoFont() }}>Direct mono usage</Text>
 * <Text style={{ fontSize: 28, fontFamily: getHeadingFont() }}>Direct heading usage</Text>
 */

// Font family constants
export const FontFamilies = {
  // Inter (default typography)
  default: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
  },

  // JetBrains Mono (default monospace)
  mono: {
    regular: 'JetBrainsMono-Regular',
    medium: 'JetBrainsMono-Medium',
  },

  // Space Grotesk (headings and branding)
  heading: {
    bold: 'SpaceGrotesk-Bold',
  },

  // Legacy fonts (keep for backward compatibility)
  legacy: {
    spaceMono: 'SpaceMono',
    systemMono: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  }
};

// Helper functions for easy access to font families
export const getDefaultFont = (weight: 'regular' | 'medium' = 'regular') => {
  return FontFamilies.default[weight];
};

export const getMonoFont = (weight: 'regular' | 'medium' = 'regular') => {
  return FontFamilies.mono[weight];
};

export const getHeadingFont = () => {
  return FontFamilies.heading.bold;
};

// Font weight mappings for the font families
export const FontWeights = {
  regular: '400',
  medium: '500',
  bold: '700',
} as const;

// Style utilities for easy inline usage
export const Typography = {
  // Default font styles (Inter)
  default: (weight: 'regular' | 'medium' = 'regular') => ({
    fontFamily: getDefaultFont(weight),
  }),

  // Monospace font styles (JetBrains Mono)
  mono: (weight: 'regular' | 'medium' = 'regular') => ({
    fontFamily: getMonoFont(weight),
  }),

  // Heading font style (Space Grotesk)
  heading: () => ({
    fontFamily: getHeadingFont(),
  }),

  // Header text style
  header: () => ({
    fontFamily: getDefaultFont('medium'),
  }),

  // Body text style
  body: () => ({
    fontFamily: getDefaultFont('regular'),
  }),

  // Legacy font styles (for backward compatibility)
  legacy: {
    spaceMono: () => ({
      fontFamily: FontFamilies.legacy.spaceMono,
    }),
    systemMono: () => ({
      fontFamily: FontFamilies.legacy.systemMono,
    }),
  }
};
