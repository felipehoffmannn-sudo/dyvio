# {Nome do tema}

{Uma frase sobre o tema e a sensação que ele passa.}

## Color Palette

- **{Nome da cor}**: `#{hex}` - {papel: fundo principal}
- **{Nome da cor}**: `#{hex}` - {papel: superfície / fundo alternativo}
- **{Nome da cor}**: `#{hex}` - {papel: texto}
- **{Nome da cor}**: `#{hex}` - {papel: acento — botões, links, destaque}
- **{Nome da cor}**: `#{hex}` - {papel: divisores / texto secundário}

## Typography

- **Headers**: {fonte livre} ({onde obter, ex.: Google Fonts})
- **Body Text**: {fonte livre}

## Best Used For

{Para que tipo de página este tema foi pensado.}

## Tokens CSS

```css
:root {
  --color-bg: #{hex};
  --color-surface: #{hex};
  --color-text: #{hex};
  --color-text-secondary: #{hex};
  --color-accent: #{hex};
  --color-border: #{hex};
  --font-display: "{fonte}", {fallback};
  --font-body: "{fonte}", {fallback};
  --radius: {px};
  --space-unit: {px};
}
```

## Contraste

| Texto | Fundo | Razão | WCAG AA |
|-------|-------|-------|---------|
| text | bg | {x}:1 | {passa/falha} |
| bg (texto do botão) | accent | {x}:1 | {passa/falha} |
