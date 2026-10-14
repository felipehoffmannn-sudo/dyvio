import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

// 600 is the solid/CTA shade: white text on #2F7D67 is 4.9:1 (WCAG AA).
const accent = {
  50: { value: "#F1F7F5" },
  100: { value: "#DCEDE7" },
  200: { value: "#B9DBCF" },
  300: { value: "#8BC3B0" },
  400: { value: "#58A68C" },
  500: { value: "#3D8F76" },
  600: { value: "#2F7D67" },
  700: { value: "#276853" },
  800: { value: "#1F5343" },
  900: { value: "#173E32" },
  950: { value: "#0F2921" },
}

const customConfig = defineConfig({
  globalCss: {
    body: {
      fontFeatureSettings: '"tnum"',
    },
  },
  theme: {
    tokens: {
      colors: {
        brand: accent,
        green: accent,
      },
      fonts: {
        heading: { value: "var(--font-sans), system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif" },
        body: { value: "var(--font-sans), system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif" },
        mono: { value: "'JetBrains Mono', 'Fira Code', monospace" },
      },
      fontSizes: {
        "4xl": { value: "36px" },
        "3xl": { value: "30px" },
        "2xl": { value: "24px" },
        "xl": { value: "20px" },
      },
      letterSpacings: {
        tight: { value: "-0.02em" },
      },
      shadows: {
        xs: { value: "0 1px 2px 0 rgba(0, 0, 0, 0.04)" },
        sm: { value: "0 1px 2px 0 rgba(0, 0, 0, 0.04)" },
        md: { value: "0 4px 12px -2px rgba(0, 0, 0, 0.06)" },
        lg: { value: "0 8px 24px -4px rgba(0, 0, 0, 0.08)" },
        card: { value: "none" },
      },
      radii: {
        card: { value: "12px" },
        button: { value: "10px" },
      },
    },
    semanticTokens: {
      colors: {
        "bg.page": { value: { base: "#FAFAFA", _dark: "#0A0A0A" } },
        "bg.card": { value: { base: "{colors.white}", _dark: "#141414" } },
        "border.card": { value: { base: "#EBEBEB", _dark: "#262626" } },
        "fg.subtle": { value: { base: "{colors.gray.500}", _dark: "{colors.gray.400}" } },
        positive: { value: { base: "{colors.green.600}", _dark: "{colors.green.300}" } },
        negative: { value: { base: "{colors.red.600}", _dark: "{colors.red.400}" } },
      },
    },
  },
})

export const system = createSystem(defaultConfig, customConfig)
