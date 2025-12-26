import { createTheme, rem, type MantineColorsTuple } from "@mantine/core";

// HotUKDeals brand color - orange/red
const hotukdeals: MantineColorsTuple = [
  "#fff4e6",
  "#ffe8cc",
  "#ffd099",
  "#ffb666",
  "#ff9f3d",
  "#ff8f1f",
  "#ff8510",
  "#e37200",
  "#ca6500",
  "#af5500",
];

// Discord brand color - blurple
const discord: MantineColorsTuple = [
  "#eef3ff",
  "#dce4f5",
  "#b9c7e2",
  "#94a8ce",
  "#748ebd",
  "#5f7cb3",
  "#5474af",
  "#44639a",
  "#3a588a",
  "#2c4b7c",
];

export const theme = createTheme({
  primaryColor: "hotukdeals",
  primaryShade: { light: 6, dark: 7 },

  colors: {
    hotukdeals,
    discord,
  },

  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',

  headings: {
    fontWeight: "600",
    sizes: {
      h1: { fontSize: rem(32), lineHeight: "1.2" },
      h2: { fontSize: rem(26), lineHeight: "1.25" },
      h3: { fontSize: rem(22), lineHeight: "1.3" },
      h4: { fontSize: rem(18), lineHeight: "1.35" },
    },
  },

  radius: {
    xs: rem(4),
    sm: rem(6),
    md: rem(8),
    lg: rem(12),
    xl: rem(16),
  },
  defaultRadius: "md",

  components: {
    Button: {
      defaultProps: {
        radius: "md",
      },
    },
    Card: {
      defaultProps: {
        radius: "lg",
        shadow: "sm",
        padding: "lg",
        withBorder: true,
      },
    },
    TextInput: {
      defaultProps: {
        radius: "md",
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
  },

  respectReducedMotion: true,
});
