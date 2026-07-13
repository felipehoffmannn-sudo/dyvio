import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const customConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#EEFAF5" },
          100: { value: "#D4F2E8" },
          200: { value: "#A9E5D1" },
          300: { value: "#83D8BD" },
          400: { value: "#6FD0B2" },
          500: { value: "#5CC5A7" },
          600: { value: "#5CC5A7" },
          700: { value: "#4AA88D" },
          800: { value: "#388A73" },
          900: { value: "#266D5A" },
        },
        green: {
          50: { value: "#EEFAF5" },
          100: { value: "#D4F2E8" },
          200: { value: "#A9E5D1" },
          300: { value: "#83D8BD" },
          400: { value: "#6FD0B2" },
          500: { value: "#5CC5A7" },
          600: { value: "#5CC5A7" },
          700: { value: "#4AA88D" },
          800: { value: "#388A73" },
          900: { value: "#266D5A" },
        },
      },
      fonts: {
        heading: { value: "'Stack Sans Text', 'Inter', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif" },
        body: { value: "'Stack Sans Text', 'Inter', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif" },
        mono: { value: "'JetBrains Mono', 'Fira Code', monospace" },
      },
      fontSizes: {
        "4xl": { value: "40px" },
        "3xl": { value: "32px" },
        "2xl": { value: "28px" },
        "xl": { value: "24px" },
      },
      shadows: {
        xs: { value: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" },
        sm: { value: "0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.04)" },
        md: { value: "0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.05)" },
        lg: { value: "0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.05)" },
        card: { value: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.03)" },
      },
      radii: {
        card: { value: "16px" },
        button: { value: "12px" },
      },
    },
    semanticTokens: {
      colors: {
        "bg.page": { value: { base: "{colors.gray.50}", _dark: "{colors.gray.950}" } },
        "bg.card": { value: { base: "{colors.white}", _dark: "{colors.gray.900}" } },
        "border.card": { value: { base: "{colors.gray.100}", _dark: "{colors.gray.800}" } },
      },
    },
  },
})

export const system = createSystem(defaultConfig, customConfig)

