# Checklist de completude — design reference

Rodar antes de entregar o documento. Itens **[crítico]** bloqueiam a entrega; corrija e rode de novo. Itens **[recomendado]** podem ficar abertos se listados em "Gaps e decisões pendentes".

## Fontes e método

- [ ] **[crítico]** Toda imagem citada existe como arquivo em `docs/design-references/assets/{slug}/` e aparece em "Imagens fonte".
- [ ] **[crítico]** Em captura de página ao vivo, as capturas cobrem do topo ao rodapé sem pular regiões.
- [ ] **[crítico]** O método (cego ou assistido) está nos metadados; em modo assistido, todo valor vindo do navegador está marcado `(DOM)` e fica fora da comparação em "Validação".

## Cobertura da página

- [ ] **[crítico]** Toda região visível na imagem tem um ID na árvore (seção 3.1) e uma linha no inventário de seções (seção 4).
- [ ] **[crítico]** Varredura feita de cima para baixo **e** da esquerda para a direita; cantos, rodapé e elementos flutuantes (toasts, FABs, tooltips) conferidos.
- [ ] **[recomendado]** Telas densas foram analisadas por região (segunda passagem) e não só em visão geral.

## Tokens

- [ ] **[crítico]** Escala da imagem calibrada e registrada nos metadados; todas as medidas estão em px CSS.
- [ ] **[recomendado]** O `accent` vem de texto/preenchimento sólido da marca, não de glow, borda fina ou gradiente.
- [ ] **[crítico]** Paleta tem no mínimo background, text-primary e accent — ou o papel marcado explicitamente como N/A.
- [ ] **[crítico]** Toda linha de token tem coluna de confiança preenchida.
- [ ] **[crítico]** Nenhum hex, fonte ou medida aparece como "oficial" sem confiança **alta**; inferências estão marcadas como média/baixa.
- [ ] **[recomendado]** Escala tipográfica cobre todos os tamanhos de texto visíveis (título, corpo, label, caption).
- [ ] **[recomendado]** Unidade base de espaçamento identificada (4 ou 8) ou marcada como inconsistente.

## Componentes

- [ ] **[crítico]** Todo botão, input, select, checkbox, toggle e link visível está no inventário de componentes (seção 6).
- [ ] **[crítico]** Cada componente tem ocorrências, variantes e anatomia.
- [ ] **[recomendado]** Componentes repetidos foram agrupados em um único padrão com variantes, em vez de duplicados.
- [ ] **[recomendado]** Notas de acessibilidade incluem contraste aparente de texto sobre fundo colorido.

## Conteúdo e interação

- [ ] **[recomendado]** Strings visíveis relevantes (títulos, labels, placeholders, CTAs) estão na seção 8.2.
- [ ] **[recomendado]** Dados de exemplo marcados como dinâmicos.

## Princípios e não copiar

- [ ] **[crítico]** Seção 12 lista logo, fotos, textos e fontes da marca em "Não copiar", cada um com substituto sugerido.
- [ ] **[recomendado]** Princípios dizem onde a referência gasta a ousadia, em vez de repetir os tokens.

## Fechamento

- [ ] **[crítico]** Seção 10 tem os três blocos: *O que está claro*, *O que é ambíguo*, *Próximo passo recomendado*.
- [ ] **[crítico]** Nenhum placeholder `{...}` do template sobrou no documento final.
- [ ] **[recomendado]** Guia de implementação (seção 11) cita componentes existentes do projeto alvo quando houver.
