---
name: robertinho
description: >-
  Robertinho, o orquestrador que constrói um site próprio a partir de
  referências de design. Recebe URLs ou imagens de referência e um briefing,
  analisa cada referência com design-reference-analyzer (em paralelo),
  sintetiza uma direção de design e um tema próprios, pede uma única aprovação,
  constrói com frontend-design (e web-animation-design para movimento) e
  verifica com webapp-testing, em loop até passar. Use quando o usuário quiser
  construir ou redesenhar um site ou página a partir de referências, ajustar
  animações e transições do site, ou chamar o "Robertinho" pelo nome.
disable-model-invocation: false
---

# Robertinho — do site de referência ao seu site

Orquestra seis skills, que se comunicam por arquivos numa pasta de projeto:

| Etapa | Skill | Produz |
|-------|-------|--------|
| Análise de referências | [design-reference-analyzer](../design-reference-analyzer/SKILL.md) | `referencias/{slug}.md` |
| Design system de apoio | [ui-ux-pro-max](../ui-ux-pro-max/SKILL.md) | `01-design-system.md` |
| Tema | formato de [theme-factory](../theme-factory/SKILL.md) | `02-tema.md` |
| Construção | [frontend-design](../frontend-design/SKILL.md) + guias de stack da [ui-ux-pro-max](../ui-ux-pro-max/SKILL.md) | código do site |
| Movimento | [web-animation-design](../web-animation-design/SKILL.md) | transições e animações no código |
| Verificação | [webapp-testing](../webapp-testing/SKILL.md) + [scripts/verify_site.py](scripts/verify_site.py) | `03-verificacao.md` |

**Regra central:** referências são inspiração. O resultado é o site do usuário, com o conteúdo, a marca e o tema dele. Estrutura, ritmo e ideias de composição podem ser reaproveitados; logo, nome, fotos, textos e fontes pagas das referências nunca vão para o código.

## Pasta do projeto

```text
docs/sites/{site}/
├── 00-briefing.md        ← templates/00-briefing.md
├── referencias/          ← um documento por referência + assets/{slug}/
├── 01-design-system.md   ← saída da ui-ux-pro-max (--design-system)
├── 01-sintese.md         ← templates/01-sintese.md
├── 02-tema.md            ← templates/02-tema.md
├── 03-verificacao.md     ← templates/03-verificacao.md
└── verificacao/          ← screenshots e report.json de cada rodada
```

`{site}` é o nome do site do usuário em kebab-case.

**Retomada:** ao começar, verifique quais arquivos já existem e continue da primeira etapa incompleta. Não refaça etapas prontas, a menos que o usuário peça ou que um arquivo anterior tenha mudado depois.

## Workflow

```text
- [ ] 1. Briefing
- [ ] 2. Captura das referências (sequencial)
- [ ] 3. Análise das referências (subagentes em paralelo)
- [ ] 4. Síntese + tema
- [ ] 5. Aprovação (única parada)
- [ ] 6. Construção
- [ ] 7. Verificação (loop, até 3 rodadas)
- [ ] 8. Relatório
```

### 1. Briefing

Preencha [templates/00-briefing.md](templates/00-briefing.md) com o que o usuário disse: assunto do site, público, objetivo principal, páginas, conteúdo disponível, marca existente (logo, cores, fontes), restrições e onde construir.

Não pare para perguntar o que falta. Preencha com a suposição mais razoável, marque com `(suposição)` e siga; o usuário confirma tudo de uma vez na etapa 5. Onde construir, por padrão: o projeto atual (leia `package.json`), substituindo a página inicial.

### 2. Captura das referências

Para cada URL, faça a captura seguindo "Captura de página ao vivo" do [design-reference-analyzer](../design-reference-analyzer/SKILL.md), salvando em `docs/sites/{site}/referencias/assets/{slug}/`. Faça uma referência por vez: o navegador é compartilhado e capturas em paralelo se atrapalham. Imagens enviadas pelo usuário só são copiadas para a mesma estrutura.

### 3. Análise das referências

Lance um subagente por referência, todos na mesma chamada, para rodarem em paralelo (ferramenta `Task`, tipo `generalPurpose`). Prompt de cada um:

```text
Leia e siga .cursor/skills/design-reference-analyzer/SKILL.md.
Referência: {URL ou nome}. Capturas já salvas em docs/sites/{site}/referencias/assets/{slug}/ — não capture de novo.
Pasta de destino: docs/sites/{site}/referencias/ (documento {slug}.md).
Método: cego. Não leia estilos do navegador.
Stack alvo: {stack do briefing}.
Responda só com: caminho do documento, 3 frases de resumo e os itens de "Não copiar".
```

Se subagentes não estiverem disponíveis, analise as referências você mesmo, uma por vez. Ao final, confira se cada documento existe e passou no checklist do analisador.

### 4. Síntese e tema

Antes da síntese, gere o design system de apoio com a [ui-ux-pro-max](../ui-ux-pro-max/SKILL.md), usando o tipo de produto e o público do briefing (2–5 termos, sem nomes das referências):

```bash
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "{tipo de produto} {setor} {palavras-chave}" \
  --design-system -p "{nome do site}" -f markdown > docs/sites/{site}/01-design-system.md
```

Confira se o padrão e o estilo retornados combinam com o briefing; se não, refaça uma vez com termos mais específicos. Esse arquivo é uma segunda opinião baseada em dados, não a direção: use as recomendações de paleta, tipografia e efeitos para desempatar conflitos entre referências, e trate a lista "Avoid (Anti-patterns)" como restrição do setor.

Leia o briefing, o `01-design-system.md` e todos os documentos de referência. Preencha [templates/01-sintese.md](templates/01-sintese.md):

1. **Pegar / adaptar / descartar** por referência, citando a seção do documento de origem (ex.: `cine-tutu-home §6 SessionRow`).
2. **Conflitos** entre referências (duas paletas, dois estilos de navegação) e a escolha feita, com o motivo ligado ao briefing.
3. **Direção do site:** princípios próprios em 3–5 frases e onde o site gasta a ousadia. A direção nasce do assunto do briefing, não da referência.
4. **Revisão contra padrões genéricos:** compare a direção com a lista de visuais genéricos da [frontend-design](../frontend-design/SKILL.md) (seção "Process") e com os anti-patterns do `01-design-system.md`. Para cada traço coincidente, decida se é escolha justificada pelo briefing ou se deve mudar, e registre.
5. **Não copiar consolidado:** junte as listas de todas as referências e defina o substituto de cada item (fontes livres do Google Fonts, fotos do usuário ou blocos de cor, textos do briefing).
6. **Mapa do site:** páginas e seções, cada uma ligada ao padrão de referência que a inspira.

Depois preencha [templates/02-tema.md](templates/02-tema.md): 4–6 cores nomeadas e um par de fontes, no formato dos temas da theme-factory, mais os tokens CSS correspondentes. Fontes só livres (Google Fonts ou fontes do sistema), a menos que o briefing traga fontes licenciadas do usuário.

### 5. Aprovação

É a única parada. Mostre ao usuário, em uma mensagem curta:

- as suposições do briefing (o que tiver `(suposição)`);
- a direção em 2–3 frases e o mapa do site;
- a paleta e as fontes do tema;
- o que será substituído das referências.

Use a ferramenta `AskQuestion` com as opções "Aprovar e construir" e "Ajustar" (o usuário descreve o ajuste em "Other"). Em ajuste, atualize os arquivos e mostre de novo só o que mudou. Não construa sem aprovação.

### 6. Construção

Leia e siga [frontend-design](../frontend-design/SKILL.md), com estas adaptações:

- O plano de tokens que ela pede na primeira passada já existe: é o `02-tema.md` aprovado, mais o mapa do site da síntese. Não invente outro; vá direto para a revisão do plano e a construção.
- Conteúdo: só textos e imagens do briefing. Sem imagem do usuário, use blocos de cor do tema ou ilustração simples em CSS/SVG, nunca as fotos das referências.
- Construa seção por seção, na ordem do mapa do site, com os tokens em variáveis CSS num único lugar.
- Siga as convenções do projeto alvo (stack, estrutura de pastas, lint). Para dúvidas de implementação na stack, consulte a ui-ux-pro-max com `--stack` (ex.: `python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "responsive layout" --stack nextjs`); para um problema pontual de UX (formulário, navegação, foco), use `--domain ux`.

#### Movimento

Toda transição ou animação (hover, troca de abas, carrossel, abertura de vídeo, entrada de seção, troca de página) segue a [web-animation-design](../web-animation-design/SKILL.md), com o detalhe de implementação em [PRACTICAL-TIPS.md](../web-animation-design/PRACTICAL-TIPS.md). Ignore a seção "Initial Response" dela: aqui ela é consultada, não invocada pelo usuário. Na prática:

- Para cada animação, responda às perguntas do "Quick Start" e escolha a curva pelo "Easing Decision Flowchart". As curvas e durações viram variáveis CSS ao lado dos outros tokens (ex.: `--ease-out`, `--duracao-rapida`), não valores soltos.
- Anime só `transform` e `opacity`. Interface fica abaixo de 300ms; só a abertura da home, vista uma vez por visita, pode ser mais longa.
- Não anime o que a pessoa repete muito (troca de dia, botões de horário) além de um retorno curto, nem ações feitas pelo teclado.
- Hover só dentro de `@media (hover: hover) and (pointer: fine)`.
- Cada elemento animado ganha a sua regra em `@media (prefers-reduced-motion: reduce)`, com `transition: none` ou `animation: none`; vídeo em autoplay vira imagem parada.
- Movimento não é onde o site gasta a ousadia, a menos que a síntese diga o contrário: prefira poucos movimentos discretos a muitos.

Quando o usuário pedir só para revisar ou ajustar animações de um site já construído, pule as etapas 1–5: leia a síntese e o tema existentes, revise o código contra a skill, apresente a revisão no formato de tabela dela (colunas Antes e Depois), aplique e siga para a verificação.

### 7. Verificação

Rode o script de verificação com o servidor do projeto (veja "Ambiente" abaixo):

```bash
.venv/bin/python .cursor/skills/webapp-testing/scripts/with_server.py \
  --server "npm run dev" --port 5173 -- \
  .venv/bin/python .cursor/skills/robertinho/scripts/verify_site.py \
    --url http://localhost:5173 --path / \
    --out docs/sites/{site}/verificacao/rodada-{n} \
    --forbid "{nome da referência}" --forbid "{fonte paga da referência}"
```

Passe um `--path` por página e um `--forbid` para cada item textual do "Não copiar" (nomes de marca, nomes de fontes). O script tira screenshots de página inteira em 1440px e 390px e checa: erros no console, rolagem horizontal, imagens sem `alt`, links e botões sem nome acessível, contraste de texto (WCAG AA), foco visível no teclado e termos proibidos no texto e nas fontes. Termina com código 1 se algo falhar.

Depois do script, abra os screenshots e compare com a síntese: todas as seções do mapa estão lá, na ordem, com os tokens do tema? Passe também pelo checklist de pré-entrega da ui-ux-pro-max ([references/pro-rules.md](../ui-ux-pro-max/references/pro-rules.md)) nos itens que o script não cobre: ícones em SVG (sem emoji), alvos de toque com pelo menos 44×44px, textos e chips que quebram linha sem cortar, e layout em 375, 768, 1024 e 1440px.

O script não testa movimento. Se a rodada mexeu em animações, confira à parte: procure no CSS cada `transition` e `animation` e veja se cada uma tem a sua regra em `prefers-reduced-motion` e se anima só `transform` ou `opacity`. Depois, abra a página com Playwright emulando movimento reduzido (`reduced_motion="reduce"` no `new_page`) e confirme que nada se move nem toca sozinho. Registre o resultado na rodada.

Registre a rodada em `03-verificacao.md` ([template](templates/03-verificacao.md)). Se algo falhar, corrija e rode de novo. **Máximo de 3 rodadas**; o que ainda falhar vai para o relatório como pendência, em vez de mais tentativas.

### 8. Relatório

Responda ao usuário com: o que foi construído (páginas e seções), screenshots finais de desktop e mobile embutidos na resposta, resultado da última verificação e pendências. Seja curto; o detalhe está nos arquivos da pasta do projeto.

## Ambiente

- Python com Playwright: `.venv/bin/python` (o `python` do sistema não tem Playwright).
- Node/npm: em `~/.local/bin`. Se `npm` não for encontrado, rode com `PATH="$HOME/.local/bin:$PATH"`.
- Dentro do agente do Cursor, o sandbox define `PLAYWRIGHT_BROWSERS_PATH` para um cache temporário sem Chromium. Rode os comandos de verificação com `env -u PLAYWRIGHT_BROWSERS_PATH`.
