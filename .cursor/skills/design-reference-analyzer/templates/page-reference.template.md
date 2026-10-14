# {Nome da página} — referência de design

> Documento gerado a partir de imagens de referência. Valores marcados com confiança **média** ou **baixa** são inferências visuais e precisam de confirmação antes de virar token oficial.

## 1. Metadados

| Campo | Valor |
|-------|-------|
| Slug | `{slug}` |
| Imagens fonte | `{caminho/da/imagem.png}` ({largura}×{altura}px) |
| Método | {cego — só imagem / assistido — valores marcados (DOM) vieram do navegador} |
| Escala assumida | {ex.: 2× — viewport CSS ~1440×900px; calibrada pelo passo de linha do corpo} |
| Breakpoint(s) | {desktop / tablet / mobile} |
| Data da análise | {AAAA-MM-DD} |
| Autor | {nome ou "design-reference-analyzer"} |
| Stack alvo | {ex.: Vite + React + TypeScript} |
| Design system conhecido | {nome ou "nenhum — tokens inferidos"} |

## 2. Resumo da página

{Um parágrafo: o que a página é, para quem, qual a tarefa principal do usuário e qual a sensação visual geral (densa, arejada, corporativa, lúdica...).}

## 3. Mapa de layout

### 3.1 Árvore de regiões

```text
Página
├── R1 Header global
│   ├── Logo
│   ├── Navegação principal (n itens)
│   └── Ações do usuário (avatar, notificações)
├── R2 Sidebar
│   └── ...
└── R3 Conteúdo principal
    ├── R3.1 Cabeçalho da página (título + ações)
    └── R3.2 ...
```

### 3.2 Esboço ASCII (opcional)

```text
+------------------------------------------------+
| R1 header                                      |
+---------+--------------------------------------+
| R2      | R3.1 título              [ação]      |
| sidebar | R3.2 conteúdo                        |
+---------+--------------------------------------+
```

### 3.3 Grid e dimensões aparentes

| Item | Valor estimado | Confiança |
|------|----------------|-----------|
| Largura do canvas | {px} | alta |
| Max-width do conteúdo | {px ou fluido} | {nível} |
| Colunas | {n colunas, gutter ~px} | {nível} |
| Sidebar | {largura px, fixa/colapsável} | {nível} |
| Altura do header | {px} | {nível} |

## 4. Inventário de seções

| ID | Nome | Descrição (propósito em uma linha) | Elementos principais | Prioridade |
|----|------|------------------------------------|----------------------|------------|
| R1 | {Header global} | {Navegação e identidade} | {logo, nav, avatar} | P0 |
| R2 | ... | ... | ... | P1 |

Prioridade: **P0** estrutura essencial, **P1** conteúdo principal, **P2** refinamento/decorativo.

## 5. Tokens inferidos

### 5.1 Paleta

| Papel | Hex | Onde aparece | Confiança |
|-------|-----|--------------|-----------|
| background | `#FFFFFF` | fundo da página | {nível} |
| surface | `#` | cards, painéis | {nível} |
| border | `#` | divisores, inputs | {nível} |
| text-primary | `#` | títulos, corpo | {nível} |
| text-secondary | `#` (ou cor base + opacidade) | labels, metadados | {nível} |
| text-muted | `#` | placeholders, itens inativos | {nível} |
| accent / primary | `#` | cor de marca em texto, links, preenchimentos | {nível} |
| accent derivados | `#` | glows, bordas, gradientes derivados da marca | {nível} |
| success | `#` ou N/A | | |
| warning | `#` ou N/A | | |
| error | `#` ou N/A | | |

### 5.2 Tipografia

| Papel | Família provável | Tamanho (~px) | Peso | Line-height (~) | Confiança |
|-------|------------------|---------------|------|-----------------|-----------|
| Display / H1 | {ex.: Inter} | 32 | 700 | 1.2 | {nível} |
| H2 | | 24 | 600 | 1.3 | |
| H3 | | 18 | 600 | 1.4 | |
| Body | | 14 | 400 | 1.5 | |
| Caption / label | | 12 | 500 | 1.4 | |

Observações: {caixa alta em labels? tracking? números tabulares em tabelas?}

### 5.3 Espaçamento

| Item | Valor (~px) | Confiança |
|------|-------------|-----------|
| Unidade base | {4 ou 8} | {nível} |
| Padding de card | | |
| Gap entre cards | | |
| Gap entre seções | | |
| Padding horizontal da página | | |

### 5.4 Raio, borda e sombra

| Item | Valor | Confiança |
|------|-------|-----------|
| Radius botão | {px} | |
| Radius card | {px} | |
| Radius input | {px} | |
| Espessura de borda | {px} | |
| Sombra card | {ex.: 0 1px 3px rgba(0,0,0,.1)} | |

### 5.5 Ícones e imagens

| Item | Valor | Confiança |
|------|-------|-----------|
| Estilo | {outline / filled / duotone} | |
| Biblioteca provável | {ex.: Lucide, Material Symbols} | |
| Tamanhos recorrentes | {16 / 20 / 24 px} | |
| Ilustrações / fotos | {descrição ou N/A} | |

## 6. Componentes observados

### {Nome sugerido, ex.: Button}

- **Ocorrências:** {R1, R3.1 — quantidade}
- **Variantes visuais:** {primary, secondary, ghost...}
- **Anatomia:** {ícone à esquerda opcional, label, ...}
- **Medidas:** {altura ~px, padding horizontal ~px}
- **Comportamento inferido:** {abre modal, submete formulário...}
- **Acessibilidade:** {contraste aparente, label visível, alvo de toque}

{Repetir para cada componente: inputs, selects, cards, badges, tabs, tabelas, avatars, modals...}

## 7. Padrões de composição

| Padrão | Onde | Estrutura |
|--------|------|-----------|
| {ex.: Page header} | R3.1 | título + subtítulo à esquerda, ações à direita |
| {ex.: Lista com toolbar} | R3.2 | busca + filtros → tabela → paginação |

## 8. Interação e conteúdo

### 8.1 Interações inferidas

| Elemento | Tipo | Comportamento esperado | Confiança |
|----------|------|------------------------|-----------|
| {Item de menu} | link | navega para {rota} | |
| {Cabeçalho de coluna} | botão | ordena | |

### 8.2 Conteúdo de referência (strings visíveis)

| Local | Texto | Estático / dinâmico |
|-------|-------|---------------------|
| R3.1 título | "{texto}" | estático |
| R3.2 linha 1 | "{texto}" | dinâmico (dado de exemplo) |

## 9. Variantes e breakpoints

{Somente se houver mais de uma imagem. Para cada variante: o que muda em relação à base (layout, componentes ocultos, estados). Caso contrário: "N/A — apenas uma imagem analisada."}

## 10. Gaps e decisões pendentes

### O que está claro

- {item}

### O que é ambíguo

- {item que precisa de confirmação — referenciar a seção/linha da tabela}

### Próximo passo recomendado

- {ação concreta}

## 11. Guia de implementação sugerido

1. **Shell:** {layout raiz, grid, header/sidebar}
2. **Tokens:** {criar variáveis CSS / tema com os valores de confiança alta; placeholders para o resto}
3. **Componentes base:** {ordem sugerida, reaproveitando o que já existir no projeto}
4. **Seções:** {ordem por prioridade P0 → P2}
5. **Estados:** {hover, foco, vazio, loading, erro}

## 12. Princípios e o que não copiar

### Princípios

{3–5 frases: onde a referência gasta a ousadia e o que mantém quieto.}

### Padrões genéricos presentes

| Traço | Onde | Observação |
|-------|------|------------|
| {ex.: fundo quase preto com um único acento vibrante} | {página} | {é escolha da marca ou só padrão?} |

### Não copiar

| Item | Tipo | Substituir por |
|------|------|----------------|
| {logo "X"} | marca | {logo próprio} |
| {fonte display "X"} | fonte paga/exclusiva (provável) | {fonte livre equivalente, ex.: ...} |
| {fotos do hero} | imagem | {fotos próprias ou banco licenciado} |
| {textos e slogans} | conteúdo | {texto próprio} |
