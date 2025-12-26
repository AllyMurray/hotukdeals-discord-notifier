import { createTheme, rem, type MantineColorsTuple } from "@mantine/core";

// Fiery amber/orange palette - the hunt's reward
const flame: MantineColorsTuple = [
  "#fff8f0",
  "#ffeddb",
  "#ffd9b3",
  "#ffc285",
  "#ffab57",
  "#ff9a38",
  "#ff9025", // Primary
  "#e67d00",
  "#cc6f00",
  "#a85a00",
];

// Deep charcoal/slate - the hunter's domain
const slate: MantineColorsTuple = [
  "#f5f5f6",
  "#e5e5e7",
  "#c8c8cc",
  "#a8a8af",
  "#888891",
  "#71717a",
  "#52525b",
  "#3f3f46", // Dark base
  "#27272a",
  "#18181b", // Deepest
];

// Discord blurple - connection indicator
const discord: MantineColorsTuple = [
  "#eef3ff",
  "#dce4f5",
  "#b9c7e2",
  "#94a8ce",
  "#748ebd",
  "#5f7cb3",
  "#5865F2", // Discord brand
  "#44639a",
  "#3a588a",
  "#2c4b7c",
];

// Success/active green
const success: MantineColorsTuple = [
  "#e6fff0",
  "#ccffe0",
  "#99ffc2",
  "#66ffa3",
  "#33ff85",
  "#10b981", // Primary
  "#0d9668",
  "#0a7a55",
  "#075e42",
  "#05432f",
];

export const theme = createTheme({
  primaryColor: "flame",
  primaryShade: { light: 6, dark: 5 },

  colors: {
    flame,
    slate,
    discord,
    success,
  },

  black: "#0f0f10",
  white: "#fafafa",

  // JetBrains Mono for that industrial, terminal feel
  // Fallback to system monospace
  fontFamily: '"Outfit", "Inter", system-ui, -apple-system, sans-serif',
  fontFamilyMonospace:
    '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',

  headings: {
    fontFamily: '"Outfit", "Inter", system-ui, -apple-system, sans-serif',
    fontWeight: "700",
    sizes: {
      h1: { fontSize: rem(40), lineHeight: "1.1", fontWeight: "800" },
      h2: { fontSize: rem(30), lineHeight: "1.15", fontWeight: "700" },
      h3: { fontSize: rem(24), lineHeight: "1.2", fontWeight: "600" },
      h4: { fontSize: rem(18), lineHeight: "1.3", fontWeight: "600" },
    },
  },

  radius: {
    xs: rem(4),
    sm: rem(6),
    md: rem(10),
    lg: rem(14),
    xl: rem(20),
  },
  defaultRadius: "md",

  shadows: {
    xs: "0 1px 2px rgba(0, 0, 0, 0.15)",
    sm: "0 2px 4px rgba(0, 0, 0, 0.2)",
    md: "0 4px 12px rgba(0, 0, 0, 0.25)",
    lg: "0 8px 24px rgba(0, 0, 0, 0.3)",
    xl: "0 16px 48px rgba(0, 0, 0, 0.35)",
  },

  spacing: {
    xs: rem(8),
    sm: rem(12),
    md: rem(16),
    lg: rem(24),
    xl: rem(32),
  },

  components: {
    Button: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        root: {
          fontWeight: 600,
          letterSpacing: "0.02em",
          transition: "all 0.2s ease",
        },
      },
    },
    Card: {
      defaultProps: {
        radius: "lg",
        padding: "lg",
      },
      styles: {
        root: {
          transition: "all 0.25s ease",
        },
      },
    },
    TextInput: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        input: {
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        },
      },
    },
    Modal: {
      defaultProps: {
        radius: "lg",
        centered: true,
      },
    },
    Container: {
      defaultProps: {
        size: "lg",
      },
    },
    Paper: {
      defaultProps: {
        radius: "lg",
      },
    },
    Badge: {
      styles: {
        root: {
          fontWeight: 600,
          letterSpacing: "0.01em",
          textTransform: "none",
        },
      },
    },
    NavLink: {
      styles: {
        root: {
          borderRadius: rem(10),
          fontWeight: 500,
          transition: "all 0.15s ease",
        },
      },
    },
    ThemeIcon: {
      styles: {
        root: {
          transition: "transform 0.2s ease",
        },
      },
    },
  },

  respectReducedMotion: true,
});
