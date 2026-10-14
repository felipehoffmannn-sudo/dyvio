---
name: design-reference-analyzer
description: >-
  Analisa imagens de design de referência (PNG, JPG, WebP, GIF — screenshots,
  mockups, inspirações) ou uma URL de página e gera um documento markdown de
  referência com mapa de layout, inventário de seções, design system inferido
  (cores, fontes, espaçamento, raio, sombra, ícones), componentes, padrões,
  princípios e o que não pode ser copiado. Use quando o usuário enviar uma
  imagem, pasta de telas ou URL e pedir para analisar o design, extrair a spec
  da página, entender o design system ou gerar uma referência de design em
  markdown. Também é chamado pelo orquestrador `robertinho`, uma vez por
  referência.
disable-model-invocation: false
---

# Design reference analyzer

Transforma uma ou mais imagens de referência num documento markdown completo o suficiente para implementar a página sem reabrir a imagem a cada decisão.

**Destino:** por padrão, `docs/design-references/{slug}.md` com capturas em `docs/design-references/assets/{slug}/`. Quando quem chamou indicar outra pasta (o orquestrador `robertinho` usa `docs/sites/{site}/referencias/`), grave o documento em `{pasta}/{slug}.md` e as capturas em `{pasta}/assets/{slug}/`. Nas instruções abaixo, `docs/design-references` vale como "pasta de destino".

**Limite fundamental:** tudo que vem de imagem é inferência. Cores, fontes e medidas levam coluna de **confiança** (alta / média / baixa). Nunca apresente um valor como token oficial sem confiança alta.

Arquivos de apoio:

- Template do documento: [templates/page-reference.template.md](templates/page-reference.template.md)
- Checklist final: [references/analysis-checklist.md](references/analysis-checklist.md)

## Workflow

Copie e acompanhe:

```text
- [ ] 1. Intake
- [ ] 2. Layout e seções
- [ ] 3. Design system inferido
- [ ] 4. Componentes e padrões
- [ ] 5. Interação e conteúdo
- [ ] 5b. Princípios e o que não copiar
- [ ] 6. Gerar o MD
- [ ] 7. QA de completude
```

### 1. Intake

1. Leia cada imagem com a ferramenta de leitura de arquivos. Registre caminho e dimensões (use `sips -g pixelWidth -g pixelHeight <arquivo>` no macOS ou `file <arquivo>` se precisar do número exato).
2. Defina o **slug** em kebab-case (a partir do nome da página ou do arquivo) e o destino `docs/design-references/{slug}.md`.
3. Colete contexto se o usuário tiver dado: produto, breakpoint, design system conhecido, stack alvo. Sem contexto, assuma o projeto atual (leia `package.json`) e registre a suposição nos metadados — não pare para perguntar.
4. Várias imagens da mesma página (estados, mobile/desktop) geram **um** documento com a seção "Variantes e breakpoints". Páginas diferentes geram documentos separados.
5. PDF não é lido como imagem: peça para exportar as páginas como PNG e siga com o que houver.
6. Se o usuário der uma URL em vez de imagens, capture a página você mesmo seguindo "Captura de página ao vivo" abaixo.

#### Captura de página ao vivo

Toda tela analisada precisa existir como arquivo em `docs/design-references/assets/{slug}/`, para que o documento possa citá-la e o script de cores possa amostrá-la.

1. Tente primeiro a captura de página inteira (`fullPage`) e confira se a altura da imagem bate com a altura da página (`document.documentElement.scrollHeight` × escala). Sites com rolagem suave ou que controlam a rolagem por script costumam devolver só um trecho.
2. Se a captura de página inteira falhar, capture tela por tela: role ~90% da altura da viewport, tire um screenshot **salvo com nome de arquivo** (`01-hero.png`, `02-programacao.png`...) e repita até o rodapé. Screenshots devolvidos só como pré-visualização da rolagem não contam como fonte.
3. Se o site rolar menos do que o pedido, confira a sobreposição entre capturas e continue rolando até o rodapé; não pule regiões.
4. Liste todos os arquivos em "Imagens fonte". Região descrita sem captura salva fica com confiança no máximo **baixa** e entra em "O que é ambíguo".

### 2. Layout e seções

Varra a imagem de cima para baixo e da esquerda para a direita. Documente:

- **Chrome global:** header, navegação lateral, breadcrumbs, footer, elementos flutuantes.
- **Regiões** com IDs hierárquicos (`R1`, `R3.2`) e propósito em uma linha.
- **Grid aparente:** colunas, sidebar fixa ou colapsável, max-width, gutters.
- **Hierarquia:** níveis de título, agrupamentos, divisores.
- **Densidade:** compacta ou arejada; tabelas, listas, cards, formulários.

**Calibre a escala antes de medir qualquer coisa.** Screenshots costumam ser @2x ou mais e o visualizador pode exibir a imagem reduzida, então nem a largura em pixels nem o tamanho exibido dizem a largura CSS. Calibre por um elemento de tamanho conhecido: meça o passo entre linhas de um parágrafo de corpo em pixels da imagem e divida por 24–28 (corpo de 16–18px). Arredonde para a densidade comum mais próxima (1, 1.5, 2, 3) e registre a escala e o método em "Escala assumida". Todas as medidas do documento ficam em px CSS.

Em telas densas, faça uma segunda passagem por região. Se a resolução não permitir ler textos ou detalhes, registre como gap e sugira um recorte da região.

### 3. Design system inferido

Preencha as tabelas da seção 5 do template:

- **Paleta:** papéis semânticos (background, surface, border, text-primary, text-secondary, accent, success/warning/error). Estime o hex observando áreas grandes e uniformes; cores de áreas pequenas, antialiasing e gradientes ficam com confiança baixa.
  - **Acento de marca:** escolha a cor saturada usada em texto, links, ícones ou preenchimentos sólidos. Bordas finas com glow e gradientes são versões escurecidas ou misturadas da marca — registre-as como derivadas, não como `accent`.
  - **Texto secundário** costuma ser branco/preto com opacidade sobre o fundo. Se o cinza amostrado for compatível com isso (ex.: `#c0c0c0` sobre `#17171d` ≈ branco a 70%), anote as duas leituras.
- **Tipografia:** classifique a família (sans geométrica, grotesca, humanista, serifada, mono) e sugira candidatas prováveis (Inter, Roboto, SF Pro...). Sites de marca usam com frequência fontes customizadas que nenhuma candidata cobre: o que importa para implementar é categoria, peso, tamanho, line-height e tracking. Família específica só com confiança alta se houver glifos distintivos claros. Estime tamanhos relativos ao corpo de texto.
- **Espaçamento:** procure a unidade base (múltiplos de 4 ou 8) medindo paddings e gaps repetidos.
- **Raio, borda, sombra:** por tipo de componente.
- **Ícones:** estilo, biblioteca provável, tamanhos.

Para hex com precisão, use [scripts/sample-colors.py](scripts/sample-colors.py) (só biblioteca padrão do Python + `sips` do macOS, sem Pillow). Com `--scale`, as coordenadas são em px CSS:

```bash
S=.cursor/skills/design-reference-analyzer/scripts/sample-colors.py
python3 $S IMG --info --scale 2                       # dimensões em px CSS
python3 $S IMG --dominant 10 --scale 2                # cores mais frequentes da imagem
python3 $S IMG --dominant 6 --region X,Y,W,H --scale 2  # cores de uma região (texto, botão)
python3 $S IMG --at X,Y --at X,Y --scale 2            # hex exato em pontos
```

`--dominant` agrupa tons próximos (arredonda os 2 bits menos significativos); use `--at` em uma área uniforme para o hex final. Para bordas de 1px, amostre em passos de meio pixel CSS até acertar a linha. Hex amostrado de área uniforme pode subir para confiança alta; espere variação de ±1–2 por canal pelo perfil de cor da captura.

### 4. Componentes e padrões

Inventarie cada tipo de elemento interativo ou repetido: botões, inputs, selects, checkboxes, toggles, tabs, cards, badges, chips, avatars, tabelas, modais, menus, paginação, estados vazio/loading/erro.

Para cada um: nome sugerido, ocorrências (IDs de região), variantes visuais, anatomia (slots), medidas aproximadas, comportamento inferido e notas de acessibilidade (contraste aparente, label visível, tamanho de alvo).

Agrupe repetições em um padrão com variantes. Depois registre **padrões de composição** — combinações recorrentes como "page header com ações à direita" ou "toolbar de filtros + tabela + paginação".

### 5. Interação e conteúdo

- Classifique elementos clicáveis como link ou botão e descreva o comportamento esperado.
- Transcreva as strings visíveis relevantes (títulos, labels, placeholders, CTAs, mensagens) e marque o que é dado de exemplo (dinâmico) versus texto fixo.

### 5b. Princípios e o que não copiar

**Princípios:** em 3–5 frases, diga o que torna esta referência marcante — onde ela gasta a ousadia (ex.: "título serifado gigante sobre foto") e o que mantém quieto (ex.: "UI em sans pequena, sem ícones"). Isso é o que vale aproveitar em outro site, mais do que os hex.

**Padrões genéricos:** marque quais traços da referência coincidem com visuais que aparecem em qualquer site gerado, para quem for reaproveitar saber que não são diferenciais. Exemplos: fundo creme com serifada de alto contraste; fundo quase preto com um único acento vibrante; rótulo em caixa alta acima de cada título; "→" no fim de botões; cards idênticos com a mesma sombra.

**Não copiar:** liste tudo que pertence à marca da referência e não pode ir para outro site: logo, nome, fotos e ilustrações, textos, fontes pagas ou exclusivas (se a família parecer comercial, diga), ícones proprietários e combinações de cor que identificam a marca sozinhas. Para cada item, sugira o que usar no lugar (fonte livre equivalente, foto própria, etc.).

### 6. Gerar o MD

1. Copie a estrutura de [templates/page-reference.template.md](templates/page-reference.template.md) e preencha todas as seções.
2. Remova todos os placeholders `{...}`. Seção sem conteúdo aplicável recebe "N/A" com o motivo.
3. Na seção 10, escreva os blocos *O que está claro*, *O que é ambíguo* (apontando a seção/linha) e *Próximo passo recomendado*.
4. Na seção 11, se o projeto alvo já tiver componentes ou tema, procure-os no código e cite quais reaproveitar.
5. Grave na pasta de destino como `{slug}.md`.

### 7. QA de completude

Rode [references/analysis-checklist.md](references/analysis-checklist.md) item por item contra o documento e a imagem. Corrija todo item **crítico** antes de entregar; itens recomendados que ficarem abertos vão para "O que é ambíguo".

**Validação opcional:** se a referência for uma página pública e o usuário der a URL, confira escala, fontes e cores de marca lendo os estilos computados no navegador (ex.: `devicePixelRatio`, `getComputedStyle` do H1, variáveis CSS do `:root`). Registre o resultado em uma seção "Validação" no fim do documento, sem apagar as inferências.

**Declare a origem de cada valor.** O método padrão é **cego**: tudo vem da imagem, e a leitura do navegador só acontece depois do documento escrito, na seção "Validação". Se você usar estilos computados ou o DOM *durante* a análise para preencher ou corrigir valores, o método passa a ser **assistido**:

- Registre "Método: assistido" nos metadados.
- Marque cada valor vindo do navegador com `(DOM)` na coluna de confiança, e não com um nível de confiança da imagem.
- Na seção "Validação", compare só os valores que vieram da imagem. Valores `(DOM)` não contam como acerto do método.

## Resposta ao usuário

Ao terminar, responda com:

- Caminho do documento gerado.
- Resumo em 2–3 frases: tipo de página, principais tokens e componentes encontrados.
- Os itens de confiança baixa que mais afetam a implementação, para o usuário confirmar.

## Exemplo de uso

> Analise `@docs/inspiration/minha-tela.png` e gere a referência em `docs/design-references/minha-tela.md`. Stack: React no sandbox.

## Fora do escopo

- Implementar a página em código. Para construir um site a partir de referências, use o orquestrador `robertinho`.
- Entrada direta do Figma. Com URL do Figma disponível, prefira o skill `figma-design-to-code` ou as ferramentas `get_variable_defs` e `search_design_system` do Figma MCP, que dão tokens exatos.
