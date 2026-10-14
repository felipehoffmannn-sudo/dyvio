# Verificação — Dyvio

## Rodada 1 — revisão geral (14/10/2026)

Escopo: todas as rotas logadas (Felipe, admin do grupo Casa) em 1440px e 390px com `verify_site.py`, leitura dos screenshots, revisão de código das telas e de `src/lib`.

### Resultado do script

| Rota | Resultado | Falhas |
|---|---|---|
| `/dashboard`, `/dashboard/groups`, `/profile`, `/invites` | OK | — |
| `/groups`, `/history`, `/notifications` | OK no script, **quebradas na tela** | Usam classes Tailwind; o projeto não tem Tailwind, então renderizam sem estilo |
| `/groups/new`, `/groups/[id]`, `/groups/[id]/expenses/new` | Falhou | Link de voltar sem nome acessível |
| `/groups/[id]/settings`, `/groups/[id]/invite` | Falhou | Contraste do avatar (4.07:1) e de "Zona de perigo" (3.61:1) |
| `/groups/[id]/expenses/new` | Falhou | Contraste de "pagou" (4.40:1) |
| `/settings` | Falhou | Botões de tema sem nome no mobile; contraste dos rótulos (2.46:1) e de "Solicitar exclusão" (3.76:1) |

### Achados (código + uso)

**Dinheiro**
1. Despesa em EUR/USD grava o valor já convertido para centavos BRL, mas com `currency: "EUR"` (ex.: "metro" = 31250 · EUR). Gera o "50,00 €" sem sentido. `expense-actions.ts:147-153`.
2. Editar despesa na página do grupo zera a categoria e salva vazia. `groups/[id]/client.tsx:177`.
3. Editar no dashboard redefine os participantes para todos os membros. `DashboardClient.tsx` (openEditModal).
4. `registerPayment` não limita o valor à dívida real (só `markPaymentReceived` limita).
5. `fullRecalc` ignora pagamentos confirmados. `ledger-engine.ts:480-508`.
6. `/groups` mostra saldo ×100. `groups/page.tsx:107-109`.
7. Datas com `toISOString().split("T")[0]`: depois das 21h a data padrão vira o dia seguinte.

**Fluxo**
8. Três telas de grupos/histórico duplicadas e órfãs (`/groups`, `/history`, `/notifications`).
9. Duas formas de criar despesa: o modal (só divisão igual, sempre "pago por você", categorias fixas no código) e o formulário completo `/groups/[id]/expenses/new` (divisão por valor/%/partes, pago por, categorias do banco), que não tem link em lugar nenhum.
10. Página do grupo: quem recebe não consegue "marcar como pago" (só no dashboard).
11. Linha da despesa no grupo usa o saldo total para dizer "quitada".
12. Exportar dados e excluir conta são placeholders (só toast).

**Consistência**
13. Só dashboard e grupos usam o `AppHeader`; as outras telas têm cabeçalhos próprios.
14. Emojis como ícones nas categorias (formulário, grupo, convites).
15. Excluir usa `window.confirm` nativo.
16. Textos: "Dashboard" (em inglês), "Toque no +" (o botão é "Nova"), marca "L" no login.
17. Modo escuro não verificado.

### Pendências
Aguardando escolha do usuário sobre quais pacotes aplicar.

## Rodada 2 — correções da revisão (pacotes dinheiro, órfãs, despesa, polimento; moeda: multimoeda)

### Resultado do script
`verify_site` logado como Felipe, 1440px e 390px: **18/18 OK** em `/dashboard`, `/dashboard/groups`, `/groups/[id]`, `/groups/[id]/settings`, `/groups/[id]/invite`, `/groups/new`, `/settings`, `/profile`, `/invites`.

### Fluxos de ponta a ponta
24/24 OK (banco copiado antes e restaurado depois):
- `/groups`, `/history`, `/notifications` e `/groups/[id]/expenses/new` redirecionam.
- Convite inválido e convite válido renderizam; aceitar o link entra no grupo e o link continua aberto.
- Despesa de € 80 dividida por valor (50 + 30): grava `originalAmount = 8000 · EUR`, partes em BRL somam o total; a lista mostra "€ 80,00 ≈ R$ 500,00".
- Editar mantém categoria e divisão; excluir pelo diálogo de confirmação; ledger continua simétrico.
- Quem recebe marca como pago no grupo: pagamento confirmado, saldo zera, despesa mostra "recebido".
- Formulário no mobile: divisão por % pré-preenchida (50/50).

### Achados resolvidos
1 (moeda original guardada), 2 e 3 (edição preserva categoria, participantes e divisão), 4 (limite à dívida), 5 (`fullRecalc` com pagamentos), 6 e 8 (telas órfãs redirecionam), 7 (datas locais), 9 (formulário único com pago por, divisão igual/valor/% e categorias do banco), 10, 11 (status pelo saldo do par), 12 (placeholders removidos), 13 (cabeçalho compartilhado com link de voltar nomeado), 14 (ícones Lucide), 15 (diálogo de confirmação), 16 (textos e marca).

### Pendências
- 17. Modo escuro continua sem verificação.
- A divisão por partes/peso não está no formulário (o banco aceita; nenhuma despesa usa).
