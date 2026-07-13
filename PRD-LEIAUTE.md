# LEIAUTE — Plataforma de Gestão de Despesas Compartilhadas

## Product Requirements Document (PRD) · UX Specification · System Design

**Versão:** 1.0  
**Data:** 2026-07-08  
**Status:** Especificação Inicial  
**Autores:** Product, UX & Engineering Team  

---

# ÍNDICE

1. [Visão do Produto](#1--visão-do-produto)
2. [Arquitetura do Sistema](#2--arquitetura-do-sistema)
3. [Modelagem de Dados](#3--modelagem-de-dados)
4. [Sistema de Grupos](#4--sistema-de-grupos)
5. [Usuários e Autenticação](#5--usuários-e-autenticação)
6. [Sistema de Despesas](#6--sistema-de-despesas)
7. [Motor Financeiro](#7--motor-financeiro)
8. [Dashboard](#8--dashboard)
9. [Especificação de Telas](#9--especificação-de-telas)
10. [Design System & Componentes](#10--design-system--componentes)
11. [Experiência do Usuário (UX)](#11--experiência-do-usuário-ux)
12. [Algoritmos Avançados](#12--algoritmos-avançados)
13. [API Reference](#13--api-reference)
14. [Banco de Dados](#14--banco-de-dados)
15. [Segurança](#15--segurança)
16. [Escalabilidade e Infraestrutura](#16--escalabilidade-e-infraestrutura)
17. [Funcionalidades Premium & Diferenciais](#17--funcionalidades-premium--diferenciais)
18. [Identidade Visual & Design](#18--identidade-visual--design)

---

## 1 · VISÃO DO PRODUTO

### 1.1 Propósito

Leiaute é uma plataforma de **gestão de despesas compartilhadas** que funciona como um livro-razão financeiro colaborativo. O sistema permite que grupos de pessoas registrem gastos, dividam valores automaticamente e acompanhem saldos entre si — sem jamais realizar pagamentos dentro da plataforma.

### 1.2 Princípios Fundamentais

| Princípio | Descrição |
|---|---|
| **Simplicidade radical** | O usuário nunca deve fazer contas. Toda complexidade matemática é interna. |
| **Confiança absoluta** | Cada transação é imutável e auditável. Nenhum centavo é perdido ou arredondado incorretamente. |
| **Colaboração transparente** | Todos os membros de um grupo veem as mesmas informações em tempo real. |
| **Zero fricção** | Criar uma despesa leva menos de 10 segundos no fluxo feliz. |
| **Offline-first** | O app funciona sem conexão e sincroniza automaticamente quando online. |

### 1.3 O que NÃO é o produto

- ❌ Não é uma carteira digital
- ❌ Não processa pagamentos
- ❌ Não é um banco
- ❌ Não emite boletos ou cobranças
- ❌ Não faz transferências de dinheiro

### 1.4 Stack Tecnológica Proposta

```
Frontend:        Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
Mobile:          React Native + Expo
Backend:         Node.js + Fastify (TypeScript)
Banco Primário:  PostgreSQL 16
Cache:           Redis (Elasticache)
Filas:           BullMQ + Redis
Armazenamento:   S3-compatible (Cloudflare R2)
WebSocket:       Socket.IO + Redis Adapter
Notificações:    Firebase Cloud Messaging + APNs
Infraestrutura:  Kubernetes + Terraform + AWS/GCP
Monitoramento:   OpenTelemetry + Grafana + Prometheus
CI/CD:           GitHub Actions
```

---

## 2 · ARQUITETURA DO SISTEMA

### 2.1 Diagrama de Arquitetura de Alto Nível

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App<br/>Next.js + React]
        MOB[Mobile App<br/>React Native + Expo]
        PWA[PWA<br/>Offline-first]
    end

    subgraph "CDN & Edge"
        CDN[Cloudflare CDN]
        EDGE[Edge Functions<br/>Rate Limiting & Auth]
    end

    subgraph "API Gateway"
        GW[Kong API Gateway<br/>Auth · Rate Limit · Routing]
    end

    subgraph "Core Services"
        AUTH[Auth Service<br/>JWT · OAuth · 2FA]
        GROUP[Group Service<br/>CRUD · Members · Permissions]
        EXPENSE[Expense Service<br/>CRUD · Split · Attachments]
        LEDGER[Ledger Engine<br/>Balance · Settlement · Currency]
        NOTIF[Notification Service<br/>Push · Email · In-App]
        SYNC[Sync Service<br/>WebSocket · Offline Queue]
        OCR[OCR Service<br/>Receipt Scanning]
        REPORT[Report Service<br/>Analytics · Export]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Primary DB)]
        RD[(Redis<br/>Cache · Queue · Pub/Sub)]
        S3[(Cloudflare R2<br/>Files · Attachments)]
        MQ[BullMQ<br/>Job Queue]
    end

    subgraph "Observability"
        OTEL[OpenTelemetry<br/>Traces]
        PROM[Prometheus<br/>Metrics]
        GRAF[Grafana<br/>Dashboards]
        ELK[ELK Stack<br/>Logs]
    end

    WEB --> CDN
    MOB --> CDN
    PWA --> CDN
    CDN --> GW
    GW --> AUTH
    GW --> GROUP
    GW --> EXPENSE
    GW --> LEDGER
    GW --> NOTIF
    GW --> SYNC
    GW --> REPORT

    AUTH --> PG
    AUTH --> RD
    GROUP --> PG
    EXPENSE --> PG
    EXPENSE --> S3
    EXPENSE --> MQ
    LEDGER --> PG
    LEDGER --> RD
    NOTIF --> MQ
    REPORT --> PG
    SYNC --> RD
    OCR --> MQ

    AUTH --> OTEL
    GROUP --> OTEL
    EXPENSE --> OTEL
    LEDGER --> OTEL
    OTEL --> PROM
    OTEL --> GRAF
    OTEL --> ELK
```

### 2.2 Comunicação entre Serviços

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant AS as Auth Service
    participant ES as Expense Service
    participant LE as Ledger Engine
    participant NS as Notification Service
    participant WS as WebSocket Sync

    C->>GW: POST /expenses (JWT)
    GW->>AS: Validate Token
    AS-->>GW: User + Permissions
    
    GW->>ES: Create Expense
    ES->>ES: Validate Participants
    ES->>ES: Calculate Splits
    
    par Parallel Operations
        ES->>LE: Update Ledger
        LE->>LE: Recalculate Balances
        LE-->>ES: New Balances
    and
        ES->>NS: Enqueue Notifications
        NS->>NS: Send Push + Email
    and
        ES->>WS: Broadcast Update
        WS-->>C: Real-time Sync
    end
    
    ES-->>GW: Expense Created
    GW-->>C: 201 + Expense JSON
```

### 2.3 Padrões de Comunicação

| Padrão | Uso |
|---|---|
| **REST (síncrono)** | CRUD de despesas, grupos, usuários |
| **WebSocket** | Atualizações em tempo real, sincronização |
| **Event-Driven (Async)** | Notificações, OCR, exportações |
| **CQRS** | Leitura de saldos (cache) vs Escrita de despesas (DB) |
| **Saga Pattern** | Criação de despesa + ledger + notificações |
| **Outbox Pattern** | Garantia de entrega de eventos |

---

## 3 · MODELAGEM DE DADOS

### 3.1 Diagrama Entidade-Relacionamento

```mermaid
erDiagram
    User ||--o{ GroupMember : "pertence a"
    User ||--o{ ExpenseParticipant : "participa de"
    User ||--o{ Payment : "realiza"
    User ||--o{ Notification : "recebe"
    User ||--o{ Session : "possui"
    User ||--o{ Attachment : "upload"
    User ||--o{ ActivityLog : "gera"
    
    Group ||--o{ GroupMember : "possui"
    Group ||--o{ Expense : "contém"
    Group ||--o{ Invite : "possui"
    Group ||--o{ GroupSettings : "configura"
    
    Expense ||--o{ ExpenseParticipant : "dividida entre"
    Expense ||--o{ Attachment : "possui"
    Expense ||--o{ ExpenseSplit : "detalha divisão"
    Expense ||--o{ ExpenseEditHistory : "histórico"
    Expense ||--o{ RecurrenceRule : "recorrência"
    
    ExpenseParticipant ||--o{ ExpenseSplit : "detalhe"
    
    Payment ||--o{ PaymentSettlement : "liquida"

    User {
        uuid id PK
        string email UK
        string password_hash
        string display_name
        string avatar_url
        string default_currency "default: BRL"
        string locale "default: pt-BR"
        string timezone "default: America/Sao_Paulo"
        jsonb preferences
        timestamp email_verified_at
        timestamp last_login_at
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    Group {
        uuid id PK
        string name
        string description
        string type "PERMANENT | TEMPORARY | EVENT"
        string visibility "PRIVATE | PUBLIC"
        string default_currency
        uuid created_by FK
        boolean is_archived "default: false"
        timestamp archived_at
        timestamp created_at
        timestamp updated_at
    }

    GroupMember {
        uuid id PK
        uuid group_id FK
        uuid user_id FK
        string role "OWNER | ADMIN | MEMBER"
        timestamp joined_at
        timestamp left_at
    }

    Expense {
        uuid id PK
        uuid group_id FK
        string title
        string description
        decimal amount "18,6 precision"
        string currency "ISO 4217"
        string split_type "EQUAL | FIXED | PERCENT | SHARES | ITEMIZED | WEIGHT | HYBRID"
        string category
        string status "ACTIVE | DELETED | ARCHIVED"
        uuid paid_by FK
        date expense_date
        string location
        jsonb tags
        jsonb metadata
        boolean is_recurring
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    ExpenseParticipant {
        uuid id PK
        uuid expense_id FK
        uuid user_id FK
        decimal share_amount
        decimal share_percentage
        integer shares "para split por shares"
        decimal weight "para split por peso"
        boolean is_payer "default: false"
    }

    ExpenseSplit {
        uuid id PK
        uuid expense_id FK
        uuid participant_id FK
        string item_name
        decimal item_amount
        integer quantity "default: 1"
    }

    ExpenseEditHistory {
        uuid id PK
        uuid expense_id FK
        uuid edited_by FK
        jsonb changes "diff das alterações"
        string reason
        timestamp created_at
    }

    Payment {
        uuid id PK
        uuid from_user_id FK
        uuid to_user_id FK
        uuid group_id FK
        decimal amount
        string currency
        string method "MANUAL | BANK_TRANSFER | PIX | CASH"
        string status "PENDING | CONFIRMED | REJECTED"
        timestamp paid_at
        timestamp created_at
        timestamp updated_at
    }

    Category {
        uuid id PK
        string name
        string icon
        string color
        uuid parent_id FK "nullable para subcategorias"
        boolean is_system "default: false"
    }

    Invite {
        uuid id PK
        uuid group_id FK
        string email
        string token UK
        string status "PENDING | ACCEPTED | REJECTED | EXPIRED"
        uuid invited_by FK
        timestamp expires_at
        timestamp created_at
    }

    Notification {
        uuid id PK
        uuid user_id FK
        string type "EXPENSE_CREATED | PAYMENT_RECEIVED | INVITE | REMINDER | SYSTEM"
        string title
        string body
        jsonb data
        boolean is_read "default: false"
        timestamp created_at
    }

    Attachment {
        uuid id PK
        uuid expense_id FK
        uuid uploaded_by FK
        string file_url
        string file_type "IMAGE | PDF | OTHER"
        bigint file_size
        string original_name
        timestamp created_at
    }

    ActivityLog {
        uuid id PK
        uuid group_id FK
        uuid user_id FK
        string action "EXPENSE_CREATED | EXPENSE_UPDATED | EXPENSE_DELETED | PAYMENT_MADE | MEMBER_JOINED | MEMBER_LEFT"
        jsonb payload
        timestamp created_at
    }

    Session {
        uuid id PK
        uuid user_id FK
        string token UK
        string refresh_token UK
        string device_info
        string ip_address
        timestamp expires_at
        timestamp created_at
    }

    RecurrenceRule {
        uuid id PK
        uuid expense_id FK
        string frequency "DAILY | WEEKLY | MONTHLY | YEARLY"
        integer interval "default: 1"
        integer day_of_month
        integer day_of_week
        date start_date
        date end_date
        integer total_occurrences
        timestamp created_at
    }

    LedgerEntry {
        uuid id PK
        uuid group_id FK
        uuid user_id FK
        uuid counterparty_id FK
        decimal balance "18,6 — positivo = deve receber, negativo = deve pagar"
        timestamp calculated_at
        boolean is_current "default: true"
    }
```

### 3.2 Política de Soft Delete

Todas as entidades críticas usam **soft delete** com coluna `deleted_at`:

| Entidade | Soft Delete | Justificativa |
|---|---|---|
| User | ✅ | LGPD requer retenção temporária antes da exclusão definitiva |
| Group | ✅ | Histórico de despesas deve ser preservado |
| Expense | ✅ | Auditoria e integridade do ledger |
| Payment | ❌ | Deletado apenas se ambos concordarem em até 24h |
| Invite | ✅ | Histórico de convites |
| Notification | ❌ | Hard delete após 90 dias |

---

## 4 · SISTEMA DE GRUPOS

### 4.1 Ciclo de Vida do Grupo

```mermaid
stateDiagram-v2
    [*] --> Created: Usuário cria grupo
    Created --> Active: Pelo menos 2 membros
    Created --> Deleted: Owner deleta (vazio)
    
    Active --> Active: Membros adicionados/removidos
    Active --> Active: Despesas registradas
    Active --> Archived: Owner arquiva
    
    Archived --> Active: Owner desarquiva
    Archived --> Deleted: Owner deleta
    
    Active --> Deleted: Owner deleta (sem despesas)
```

### 4.2 Papéis e Permissões (RBAC)

| Ação | Owner | Admin | Member |
|---|---|---|---|
| Ver despesas | ✅ | ✅ | ✅ |
| Criar despesa | ✅ | ✅ | ✅ |
| Editar própria despesa (≤24h) | ✅ | ✅ | ✅ |
| Editar qualquer despesa | ✅ | ✅ | ❌ |
| Deletar própria despesa (≤24h) | ✅ | ✅ | ✅ |
| Convidar membros | ✅ | ✅ | ❌ |
| Remover membros | ✅ | ✅ | ❌ |
| Alterar nome/descrição | ✅ | ✅ | ❌ |
| Arquivar grupo | ✅ | ❌ | ❌ |
| Transferir ownership | ✅ | ❌ | ❌ |
| Promover/remover admin | ✅ | ❌ | ❌ |
| Sair do grupo | ✅ | ✅ | ✅ |
| Ver saldos | ✅ | ✅ | ✅ |
| Registrar pagamento | ✅ | ✅ | ✅ |

### 4.3 Regras de Negócio — Grupos

1. **Um grupo precisa de no mínimo 2 membros** para ter despesas ativas.
2. **Owner não pode sair** sem transferir ownership ou deletar o grupo.
3. **Grupo sem despesas** pode ser deletado permanentemente.
4. **Grupo com despesas** só pode ser arquivado (soft delete).
5. **Convites expiram em 7 dias** se não forem aceitos.
6. **Um usuário removido** continua vendo o histórico, mas não pode interagir.
7. **Grupo arquivado** é somente leitura para todos.
8. **Transferência de ownership** exige confirmação do novo owner.

### 4.4 Tipos de Grupo

| Tipo | Característica |
|---|---|
| **PERMANENT** | Grupo padrão. Sem data de fim. Ex: "República", "Família" |
| **TEMPORARY** | Tem data de encerramento. Ex: "Viagem Praia Jan/2026" |
| **EVENT** | Grupo para um evento específico. Suporta check-in de participantes. Ex: "Churrasco Sábado" |

---

## 5 · USUÁRIOS E AUTENTICAÇÃO

### 5.1 Fluxo de Autenticação

```mermaid
sequenceDiagram
    participant U as Usuário
    participant C as Client
    participant A as Auth Service
    participant P as Provider (Google/Apple)
    participant DB as PostgreSQL

    alt Email + Senha
        U->>C: Email + Password
        C->>A: POST /auth/login
        A->>DB: Validate credentials
        A-->>C: JWT + Refresh Token
    else OAuth (Google/Apple)
        U->>C: Click "Continuar com Google"
        C->>P: OAuth Flow
        P-->>C: Authorization Code
        C->>A: POST /auth/oauth {code, provider}
        A->>P: Validate code
        P-->>A: User Info
        A->>DB: Upsert User
        A-->>C: JWT + Refresh Token
    end

    C->>C: Store tokens securely
```

### 5.2 Estratégia de Tokens

| Token | Duração | Armazenamento |
|---|---|---|
| Access Token (JWT) | 15 minutos | Memória (não localStorage) |
| Refresh Token | 7 dias | httpOnly Secure Cookie |
| OAuth State | 5 minutos | Cookie de sessão |

### 5.3 Estrutura do JWT

```json
{
  "sub": "uuid-do-usuario",
  "email": "user@email.com",
  "name": "Fulano",
  "iat": 1750444800,
  "exp": 1750445700,
  "iss": "leiaute-api",
  "aud": "leiaute-app"
}
```

### 5.4 Provedores OAuth

- ✅ Google (obrigatório)
- ✅ Apple (obrigatório para iOS — exigência App Store)
- ✅ Microsoft (desejável)
- 🔜 GitHub (futuro)

### 5.5 Perfil do Usuário

| Campo | Descrição |
|---|---|
| `display_name` | Nome exibido no app (2-60 caracteres) |
| `avatar_url` | URL da imagem de perfil |
| `default_currency` | BRL, USD, EUR, etc. |
| `locale` | pt-BR, en-US, es, etc. |
| `timezone` | IANA timezone string |
| `preferences` (JSONB) | `{ "notifications": { "push": true, "email": true }, "theme": "system" }` |

### 5.6 LGPD Compliance

- **Direito ao esquecimento:** Usuário solicita exclusão → conta é anonimizada (dados pessoais são removidos, histórico financeiro permanece com UUID anônimo)
- **Exportação de dados:** Usuário pode solicitar dump completo de seus dados
- **Retenção:** Dados pessoais são removidos em até 30 dias após solicitação
- **Cookies:** Apenas cookies essenciais (autenticação)

---

## 6 · SISTEMA DE DESPESAS

### 6.1 Estrutura Completa

```mermaid
graph TD
    E[Expense] --> EP[ExpenseParticipants]
    E --> ES[ExpenseSplits]
    E --> AT[Attachments]
    E --> EH[EditHistory]
    E --> RR[RecurrenceRule]
    
    EP --> U[User]
    EP --> CALC[Share Calculation]
    
    CALC --> EQ[Equal Split]
    CALC --> FIX[Fixed Amount]
    CALC --> PCT[Percentage]
    CALC --> SHR[Shares]
    CALC --> ITM[Itemized]
    CALC --> WGT[Weight]
    CALC --> HYB[Hybrid]
```

### 6.2 Tipos de Divisão — Detalhamento Completo

#### 6.2.1 Divisão Igual (EQUAL)

**Algoritmo:**
```
total = valor_da_despesa
num_participantes = count(participants)
valor_por_pessoa = total / num_participantes

# Arredondamento: último participante recebe o resto
resto = total - (valor_por_pessoa * num_participantes)
ultimo_participante.share = valor_por_pessoa + resto
```

**Exemplo:** Conta de R$ 100,00 entre 3 pessoas
- Pessoa A: R$ 33,33
- Pessoa B: R$ 33,33
- Pessoa C: R$ 33,34 ← recebe o centavo restante

#### 6.2.2 Valor Fixo (FIXED)

Cada participante tem um valor específico atribuído manualmente.

**Validação:** `soma_dos_valores === valor_total_da_despesa`

#### 6.2.3 Percentual (PERCENT)

Cada participante contribui com uma porcentagem.

**Validação:** `soma_das_porcentagens === 100%`

#### 6.2.4 Shares (SHARES)

Usado para dividir proporcionalmente por "partes". Útil para casais ou grupos com consumo diferente.

**Exemplo:** Cada pessoa consome N shares.
- Pessoa A: 2 shares (casal)
- Pessoa B: 1 share
- Pessoa C: 1 share

```
total_shares = 2 + 1 + 1 = 4
valor_por_share = 200 / 4 = 50
A: 2 × 50 = R$ 100
B: 1 × 50 = R$ 50
C: 1 × 50 = R$ 50
```

#### 6.2.5 Por Itens (ITEMIZED)

Cada item da despesa é atribuído a participantes específicos.

**Exemplo:** Conta de restaurante com itens:
| Item | Valor | Quem Consumiu |
|---|---|---|
| Pizza | R$ 60 | A, B, C |
| Bebida A | R$ 10 | A |
| Bebida B | R$ 8 | B |
| Sobremesa | R$ 22 | B, C |

Resultado:
- A: (60/3) + 10 = R$ 30
- B: (60/3) + 8 + (22/2) = R$ 39
- C: (60/3) + (22/2) = R$ 31

#### 6.2.6 Por Peso (WEIGHT)

Similar a shares, mas com valores decimais. Útil para rateios por m² (aluguel), dias de estadia, etc.

#### 6.2.7 Híbrida (HYBRID)

Combina múltiplos métodos. Exemplo: aluguel dividido igualmente + contas por consumo.

### 6.3 Categorias Padrão

```
🏠 Moradia        🍕 Alimentação     🚗 Transporte
🎉 Lazer          💡 Contas          🛒 Supermercado
💊 Saúde          📚 Educação        ✈️ Viagem
👕 Vestuário      🎁 Presentes       🐾 Pets
🔧 Manutenção     💻 Tecnologia      ➕ Outros
```

### 6.4 Status de Despesa

```
ACTIVE    → Visível e contabilizada nos saldos
DELETED   → Soft deleted, revertida do ledger
ARCHIVED  → Visível mas não editável (grupo arquivado)
```

### 6.5 Regras de Edição

| Ação | Janela de Tempo | Quem Pode |
|---|---|---|
| Editar | 24 horas após criação | Criador, Admin, Owner |
| Deletar | 24 horas após criação | Criador, Admin, Owner |
| Editar | Após 24h | Apenas Admin/Owner, gera notificação |
| Deletar | Após 24h | Apenas Admin/Owner, com justificativa |

### 6.6 Despesas Recorrentes

```mermaid
graph LR
    A[Despesa Original<br/>Aluguel R$ 2000<br/>Todo dia 5] --> B[Gera Job Programado]
    B --> C[5/Jul: R$ 2000]
    B --> D[5/Ago: R$ 2000]
    B --> E[5/Set: R$ 2000]
    B --> F[...]
```

**Regras:**
- Geração ocorre às 00:01 da data programada
- Se o grupo estiver arquivado, a recorrência pausa
- Pode ser cancelada a qualquer momento
- Editar a original não altera as já geradas

---

## 7 · MOTOR FINANCEIRO

### 7.1 Modelo de Ledger

O ledger armazena o saldo líquido entre CADA PAR de usuários dentro de um grupo.

```mermaid
graph LR
    A[Alice] -- "Deve R$ 50 para" --> B[Bob]
    B -- "Deve R$ 30 para" --> C[Carol]
    A -- "Deve R$ 20 para" --> C[Carol]
```

### 7.2 Atualização de Saldos — Pseudocódigo

```
function updateLedgerOnCreate(expense):
    payer = expense.paid_by
    participants = expense.participants
    
    for each participant in participants:
        if participant == payer:
            continue  // pagador não deve para si mesmo
        
        amount = participant.share_amount
        
        // Atualiza saldo: participante deve "amount" para o pagador
        ledger = getOrCreateLedger(participant.user_id, payer, expense.group_id)
        ledger.balance += amount  // participante agora deve mais
        
        // Atualiza o inverso
        reverseLedger = getOrCreateLedger(payer, participant.user_id, expense.group_id)
        reverseLedger.balance -= amount  // pagador tem mais a receber
```

### 7.3 Reversão de Despesa (Undo)

```
function reverseExpense(expense):
    // Simplesmente inverte o sinal de todos os valores
    payer = expense.paid_by
    participants = expense.participants
    
    for each participant in participants:
        if participant == payer:
            continue
        
        amount = participant.share_amount
        
        ledger = getOrCreateLedger(participant.user_id, payer, expense.group_id)
        ledger.balance -= amount  // reverte
        
        reverseLedger = getOrCreateLedger(payer, participant.user_id, expense.group_id)
        reverseLedger.balance += amount  // reverte
    
    expense.status = 'DELETED'
    expense.deleted_at = now()
```

### 7.4 Edição de Despesa — Estratégia

A edição usa a estratégia **Reverse + Recreate**:

```
function editExpense(expenseId, newData):
    old_expense = find(expenseId)
    
    BEGIN TRANSACTION:
        1. reverseExpense(old_expense)     // desfaz antiga
        2. new_expense = create(newData)   // cria nova com novos valores
        3. logEditHistory(old, new)        // registra diff
    COMMIT
```

### 7.5 Tratamento de Arredondamento

**Princípio fundamental:** NUNCA se perde ou se ganha dinheiro no arredondamento. O centavo residual sempre vai para o último participante.

```
function distributeWithRounding(total, count):
    base = floor((total / count) * 100) / 100  // trunca em centavos
    distributed = base * (count - 1)
    last_share = total - distributed
    return [base] * (count - 1) + [last_share]
```

### 7.6 Conversão de Moedas

- Taxas de câmbio atualizadas via API (Open Exchange Rates) a cada 1 hora
- Cache em Redis com TTL de 1 hora
- O valor da taxa usada é **congelado** no momento da criação da despesa
- Se a despesa é em USD e o grupo é BRL, armazenamos ambos os valores

### 7.7 Algoritmo de Liquidação Ótima (Debt Simplification)

**Objetivo:** Minimizar o número de transações para liquidar todas as dívidas do grupo.

```
function simplifyDebts(groupId):
    // 1. Coletar saldos líquidos de cada pessoa
    balances = getNetBalances(groupId)
    // Ex: {Alice: +100, Bob: -40, Carol: -60}
    // Positivo = tem a receber, Negativo = deve
    
    creditors = sortDescending(filter(balances, > 0))
    debtors = sortAscending(filter(balances, < 0))
    
    transactions = []
    i = 0, j = 0
    
    while i < len(creditors) and j < len(debtors):
        credit_amount = creditors[i].amount
        debt_amount = abs(debtors[j].amount)
        
        settled = min(credit_amount, debt_amount)
        
        transactions.append({
            from: debtors[j].user,
            to: creditors[i].user,
            amount: settled
        })
        
        creditors[i].amount -= settled
        debtors[j].amount += settled
        
        if creditors[i].amount == 0: i++
        if debtors[j].amount == 0: j++
    
    return transactions
```

**Exemplo prático:**

```
Saldos iniciais:
  Alice: +R$ 100
  Bob:   -R$ 40
  Carol: -R$ 60

Resultado sem simplificação (3 transações):
  Bob   → Alice: R$ 40
  Carol → Alice: R$ 60

Resultado com simplificação (possivelmente 2):
  Bob   → Alice: R$ 40
  Carol → Alice: R$ 60
  (Já está ótimo neste caso)
```

**Exemplo onde simplificação ajuda:**

```
Saldos:
  Alice: +R$ 80
  Bob:   +R$ 20
  Carol: -R$ 60
  Dave:  -R$ 40

Sem simplificar (4 transações):
  Carol → Alice: R$ 60
  Dave  → Alice: R$ 20
  Dave  → Bob:   R$ 20

Simplificado (3 transações):
  Carol → Alice: R$ 60
  Dave  → Alice: R$ 20
  Dave  → Bob:   R$ 20
  (Neste caso, já está minimizado)
```

### 7.8 Detecção de Inconsistências

Um job roda periodicamente e verifica:

```
function auditGroup(groupId):
    // Soma de todas as despesas ativas por pagador
    // Deve bater com a soma de todas as shares dos participantes
    
    total_paid = SUM(expense.amount) WHERE group_id = groupId AND status = 'ACTIVE'
    total_shared = SUM(participant.share_amount) WHERE expense.group_id = groupId AND status = 'ACTIVE'
    
    if abs(total_paid - total_shared) > 0.001:
        LOG_ERROR("Inconsistência no grupo " + groupId)
        ALERT("Diferença: " + (total_paid - total_shared))
        TRIGGER_RECALC(groupId)
```

### 7.9 Recalc Completo do Grupo

```
function fullRecalc(groupId):
    BEGIN TRANSACTION:
        // Zera todos os ledger entries do grupo
        UPDATE ledger SET balance = 0, is_current = false WHERE group_id = groupId
        
        // Reaplica cada despesa ativa em ordem cronológica
        expenses = SELECT * FROM expense 
                   WHERE group_id = groupId AND status = 'ACTIVE' 
                   ORDER BY created_at ASC
        
        for expense in expenses:
            updateLedgerOnCreate(expense)
        
        // Marca como current
        UPDATE ledger SET is_current = true WHERE group_id = groupId
    COMMIT
```

---

## 8 · DASHBOARD

### 8.1 Estrutura do Dashboard

```mermaid
graph TD
    DASH[Dashboard] --> HEADER[Header: Saldo Líquido Total]
    DASH --> KPI[KPIs: Devo / Me Devem]
    DASH --> GROUPS[Grupos Recentes]
    DASH --> ACTIVITY[Atividades Recentes]
    DASH --> CHART[Gráfico de Gastos]
    
    HEADER --> BALANCE[Saldo: +R$ 150,00<br/>ou -R$ 75,00]
    KPI --> OWE[DEVO<br/>R$ 340,00]
    KPI --> OWED[ME DEVEM<br/>R$ 490,00]
    
    GROUPS --> G1[República: R$ 45 deve]
    GROUPS --> G2[Viagem: R$ 120 a receber]
    GROUPS --> G3[Família: R$ 0 quitado]
    
    ACTIVITY --> A1[Alice pagou Aluguel R$ 2.000 - 2h]
    ACTIVITY --> A2[Você pagou Mercado R$ 150 - 5h]
    ACTIVITY --> A3[Bob quitou dívida com você R$ 80 - 1d]
```

### 8.2 Fórmulas dos KPIs

```
Saldo Líquido Total = Σ(me_devem) - Σ(devo)
                    = soma de todos os saldos onde sou credor
                      - soma de todos os saldos onde sou devedor

Total Devo      = Σ(ledger_entries onde balance < 0)
Total Me Devem  = Σ(ledger_entries onde balance > 0)

Gasto do Mês    = Σ(minhas despesas pagas no mês atual)
Minha Parte     = Σ(minhas shares em despesas do mês)
```

### 8.3 Gráficos

- **Pie Chart:** Gastos por categoria (mensal)
- **Bar Chart:** Evolução de gastos (últimos 6 meses)
- **Horizontal Bar:** Top 5 pessoas com quem mais divide
- **Line Chart:** Saldo líquido ao longo do tempo

---

## 9 · ESPECIFICAÇÃO DE TELAS

### 9.1 Lista Completa de Telas

| # | Tela | Rota | Descrição |
|---|---|---|---|
| 1 | Splash | `/` | Logo + animação de carregamento |
| 2 | Onboarding | `/onboarding` | 3 slides explicando o produto |
| 3 | Login | `/auth/login` | Email + senha ou OAuth |
| 4 | Cadastro | `/auth/register` | Nome, email, senha |
| 5 | Dashboard | `/dashboard` | Resumo financeiro geral |
| 6 | Lista de Grupos | `/groups` | Todos os grupos do usuário |
| 7 | Detalhe do Grupo | `/groups/[id]` | Despesas, saldos, membros |
| 8 | Nova Despesa | `/groups/[id]/expenses/new` | Formulário completo |
| 9 | Editar Despesa | `/groups/[id]/expenses/[eid]/edit` | Edição (se dentro da janela) |
| 10 | Detalhe da Despesa | `/groups/[id]/expenses/[eid]` | Visualização completa |
| 11 | Perfil | `/profile` | Dados do usuário |
| 12 | Configurações | `/settings` | Preferências, tema, moeda |
| 13 | Notificações | `/notifications` | Central de notificações |
| 14 | Convites | `/invites` | Convites pendentes |
| 15 | Histórico | `/history` | Todas as despesas (todos os grupos) |
| 16 | Pagamento | `/groups/[id]/settle` | Tela de liquidação |
| 17 | Convite (público) | `/invite/[token]` | Aceitar/rejeitar convite |
| 18 | Erro 404 | `*` | Página não encontrada |
| 19 | Erro 500 | — | Erro interno |
| 20 | Offline | — | Indicador de offline |

### 9.2 Tela: Dashboard (`/dashboard`)

**Objetivo:** Dar uma visão instantânea da situação financeira do usuário.

**Layout (Mobile-first):**

```
┌──────────────────────────────┐
│  ☰ Leiaute            🔔 👤  │  ← Header fixo
├──────────────────────────────┤
│                              │
│   Seu saldo total            │
│   ┌──────────────────────┐  │
│   │  + R$ 1.250,00       │  │  ← Card principal
│   │  Você tem a receber   │  │     Verde se positivo
│   └──────────────────────┘  │     Vermelho se negativo
│                              │
│   ┌──────────┐ ┌──────────┐ │
│   │  DEVO    │ │ME DEVEM  │ │  ← KPIs lado a lado
│   │ R$340,00 │ │R$490,00  │ │
│   └──────────┘ └──────────┘ │
│                              │
│   Grupos               +─── │
│   ┌──────────────────────┐  │
│   │ 🏠 República         │  │  ← Card de grupo
│   │   Você deve R$ 45,00 │  │     Swipe para ações
│   └──────────────────────┘  │
│   ┌──────────────────────┐  │
│   │ ✈️ Viagem Japão      │  │
│   │   Te devem R$ 320,00 │  │
│   └──────────────────────┘  │
│                              │
│   Atividade recente         │
│   • Alice pagou Aluguel     │
│   • Você pagou Mercado      │
│   • Bob quitou dívida       │
│                              │
├──────────────────────────────┤
│  📊 Grupos  ✚  ⚙️ Perfil   │  ← Bottom nav
└──────────────────────────────┘
```

**Estados:**
- **Empty State (primeiro acesso):** Ilustração + "Você ainda não tem grupos. Crie seu primeiro grupo!"
- **Loading:** Skeleton cards com animação de shimmer
- **Offline:** Banner amarelo no topo "Você está offline. Alterações serão sincronizadas."
- **Erro:** Card de erro com botão "Tentar novamente"

### 9.3 Tela: Detalhe do Grupo (`/groups/[id]`)

**Layout:**

```
┌──────────────────────────────┐
│  ← República          ⚙️ ⋮  │  ← Header com nome do grupo
├──────────────────────────────┤
│  ┌────────────────────────┐  │
│  │  Seu saldo no grupo    │  │  ← Card de saldo
│  │  Você deve R$ 45,00    │  │
│  │                        │  │
│  │  ▸ Ver liquidação      │  │  ← Link para settle
│  └────────────────────────┘  │
│                              │
│  Membros                     │
│  👤👤👤👤 + convidar        │  ← Avatar row
│                              │
│  Categorias (filtro)         │
│  [Todos] [🍕] [🏠] [✈️]     │  ← Chips horizontais
│                              │
│  Despesas             🔍 📅  │
│  ┌────────────────────────┐  │
│  │ 5 Jul · Aluguel        │  │
│  │ Alice pagou R$ 2.000   │  │  ← Card de despesa
│  │ Você deve R$ 500       │  │     com valor colorido
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ 3 Jul · Mercado         │  │
│  │ Você pagou R$ 150      │  │
│  │ Bob te deve R$ 75      │  │
│  └────────────────────────┘  │
│          ⋮                   │
│                              │
│           [+ Nova Despesa]   │  ← FAB
└──────────────────────────────┘
```

### 9.4 Tela: Nova Despesa (`/groups/[id]/expenses/new`)

**Formulário completo:**

```
┌──────────────────────────────┐
│  ✕ Nova despesa              │  ← Sheet/Drawer no mobile
├──────────────────────────────┤
│                              │
│  📝 Descrição                │
│  ┌────────────────────────┐  │
│  │ Aluguel Julho          │  │  ← Input com autofocus
│  └────────────────────────┘  │
│                              │
│  💰 Valor                    │
│  ┌────────────────────────┐  │
│  │ R$ 2.000,00            │  │  ← Currency input
│  └────────────────────────┘  │
│                              │
│  👤 Pago por                 │
│  ┌────────────────────────┐  │
│  │ 👤 Alice        ▾      │  │  ← Select com avatares
│  └────────────────────────┘  │
│                              │
│  👥 Dividido com             │
│  ┌────────────────────────┐  │
│  │ ☑ Alice (você)        │  │  ← Checkbox list
│  │ ☑ Bob                 │  │     de participantes
│  │ ☑ Carol               │  │
│  │ ☐ Dave                │  │
│  └────────────────────────┘  │
│                              │
│  📊 Tipo de divisão          │
│  [Igual] [Fixo] [%] [Itens] │  ← Segmented control
│                              │
│  🏷 Categoria                │
│  [🏠] [🍕] [🚗] [💡] [➕]   │  ← Category picker
│                              │
│  📅 Data                     │
│  ┌────────────────────────┐  │
│  │ 05/07/2026             │  │
│  └────────────────────────┘  │
│                              │
│  🔄 Recorrente?              │
│  [Não] [Sim, mensalmente ▾]  │  ← Toggle + frequency
│                              │
│  📎 Anexos                   │
│  ┌────────────────────────┐  │
│  │ 📷 Foto do recibo      │  │  ← Upload area
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │    💾 Salvar despesa   │  │  ← Primary CTA
│  └────────────────────────┘  │
└──────────────────────────────┘
```

**Validações em tempo real:**
- Valor não pode ser zero ou negativo
- Pelo menos 1 participante além do pagador
- Se divisão fixa: soma deve bater com o total (mostrar diferença)
- Se percentual: soma deve ser 100% (mostrar barra de progresso)

### 9.5 Tela: Liquidação (`/groups/[id]/settle`)

```
┌──────────────────────────────┐
│  ← Liquidação                │
├──────────────────────────────┤
│                              │
│   Pagamentos sugeridos       │
│   (forma mais eficiente)     │
│                              │
│   ┌──────────────────────┐  │
│   │  Você → Alice        │  │
│   │  R$ 45,00            │  │  ← Card de pagamento
│   │  [Marcar como pago]  │  │     sugerido
│   └──────────────────────┘  │
│                              │
│   ┌──────────────────────┐  │
│   │  Você → Bob          │  │
│   │  R$ 120,00           │  │
│   │  [Marcar como pago]  │  │
│   └──────────────────────┘  │
│                              │
│   Outras transações          │
│   ┌──────────────────────┐  │
│   │  Bob → Carol         │  │
│   │  R$ 30,00            │  │  ← Card com opacidade
│   │  Pendente            │  │     reduzida (não envolve
│   └──────────────────────┘  │     o usuário atual)
│                              │
│   ┌──────────────────────┐  │
│   │  📤 Exportar relatório │  │  ← Ação secundária
│   └──────────────────────┘  │
└──────────────────────────────┘
```

### 9.6 Telas de Erro e Estados Vazios

**Empty State — Sem Grupos:**
```
┌──────────────────────────────┐
│                              │
│        📋                    │
│                              │
│   Nenhum grupo ainda         │
│                              │
│   Crie um grupo para         │
│   começar a dividir          │
│   despesas com amigos        │
│                              │
│   ┌────────────────────┐    │
│   │  ✚ Criar grupo    │    │
│   └────────────────────┘    │
│                              │
│   ┌────────────────────┐    │
│   │  🔗 Entrar com     │    │
│   │  link de convite   │    │
│   └────────────────────┘    │
└──────────────────────────────┘
```

**Empty State — Sem Despesas no Grupo:**
```
┌──────────────────────────────┐
│                              │
│        🧾                    │
│                              │
│   Nenhuma despesa ainda      │
│                              │
│   Toque no + para adicionar  │
│   a primeira despesa         │
│   deste grupo                │
│                              │
│   Todos os saldos estão      │
│   zerados por enquanto       │
│                              │
└──────────────────────────────┘
```

**404:**
```
┌──────────────────────────────┐
│                              │
│        🔮                    │
│                              │
│    404 — Perdido?            │
│                              │
│   A página que você          │
│   procura não existe         │
│   ou foi movida.             │
│                              │
│   ┌────────────────────┐    │
│   │  ← Voltar ao início│    │
│   └────────────────────┘    │
└──────────────────────────────┘
```

---

## 10 · DESIGN SYSTEM & COMPONENTES

### 10.1 Tokens de Design

#### Cores — Light Mode

| Token | Valor | Uso |
|---|---|---|
| `--bg-primary` | `#FFFFFF` | Fundo principal |
| `--bg-secondary` | `#F8F9FA` | Fundo de cards |
| `--bg-tertiary` | `#F1F3F5` | Fundo de inputs |
| `--text-primary` | `#11181C` | Texto principal |
| `--text-secondary` | `#687076` | Texto secundário |
| `--text-tertiary` | `#9BA1A6` | Texto terciário |
| `--accent` | `#0066FF` | Ação primária, links |
| `--accent-hover` | `#0052CC` | Hover do primário |
| `--success` | `#30A46C` | Saldo positivo, sucesso |
| `--danger` | `#E5484D` | Saldo negativo, erro |
| `--warning` | `#FFB224` | Avisos |
| `--border` | `#DFE3E6` | Bordas |
| `--border-light` | `#EBEDF0` | Bordas sutis |

#### Cores — Dark Mode

| Token | Valor |
|---|---|
| `--bg-primary` | `#0D0D0D` |
| `--bg-secondary` | `#1A1A1A` |
| `--bg-tertiary` | `#262626` |
| `--text-primary` | `#EDEDED` |
| `--text-secondary` | `#A1A1A1` |
| `--text-tertiary` | `#6B6B6B` |
| `--accent` | `#3385FF` |
| `--border` | `#333333` |

#### Tipografia

| Token | Font | Size | Weight | Line Height |
|---|---|---|---|---|
| `--text-xs` | Inter | 12px | 400 | 16px |
| `--text-sm` | Inter | 14px | 400 | 20px |
| `--text-base` | Inter | 16px | 400 | 24px |
| `--text-lg` | Inter | 18px | 500 | 28px |
| `--text-xl` | Inter | 20px | 600 | 28px |
| `--text-2xl` | Inter | 24px | 600 | 32px |
| `--text-3xl` | Inter | 32px | 700 | 40px |
| `--text-4xl` | Inter | 40px | 700 | 48px |

#### Espaçamento (Escala de 4px)

```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
```

#### Bordas e Sombras

```
--radius-sm: 6px
--radius-md: 8px
--radius-lg: 12px
--radius-xl: 16px
--radius-2xl: 24px
--radius-full: 9999px

--shadow-sm: 0 1px 2px rgba(0,0,0,0.04)
--shadow-md: 0 4px 12px rgba(0,0,0,0.06)
--shadow-lg: 0 8px 24px rgba(0,0,0,0.08)
--shadow-xl: 0 16px 48px rgba(0,0,0,0.10)
```

### 10.2 Catálogo de Componentes

#### Button

| Variante | Uso |
|---|---|
| `primary` | Ação principal (Salvar, Criar) |
| `secondary` | Ação secundária (Cancelar) |
| `ghost` | Ação terciária (Editar, ⋯) |
| `danger` | Ação destrutiva (Deletar, Sair) |
| `icon` | Apenas ícone |

**Estados:** `default`, `hover`, `active`, `focus`, `disabled`, `loading`

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
  onClick?: () => void;
}
```

#### CurrencyInput

Input especializado para valores monetários com máscara.

```typescript
interface CurrencyInputProps {
  value: number;        // em centavos internamente
  currency: string;     // ISO 4217
  onChange: (valueInCents: number) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}
```

**Comportamentos:**
- Formata automaticamente: `200000` → `R$ 2.000,00`
- Suporta colar valores: `"2.000,00"` ou `"2000.00"` → `R$ 2.000,00`
- Teclado numérico no mobile
- Animação de shake em valor inválido

#### SplitSelector

Componente para escolher o tipo de divisão e configurar valores.

```typescript
interface SplitSelectorProps {
  splitType: SplitType;
  totalAmount: number;
  participants: Participant[];
  onSplitChange: (splits: SplitConfig) => void;
}
```

- Equal: Mostra preview do valor por pessoa
- Fixed: Input de valor para cada pessoa com barra de progresso (soma/total)
- Percentage: Slider ou input para cada pessoa
- Itemized: Lista de itens com checkbox de participantes

#### BalanceCard

```typescript
interface BalanceCardProps {
  balance: number;   // positivo = a receber, negativo = deve
  currency: string;
  groupName?: string;
  variant: 'total' | 'group';
}
```

Renderização:
- Valor positivo: verde (`--success`) + texto "Você tem a receber"
- Valor negativo: vermelho (`--danger`) + texto "Você deve"
- Valor zero: cinza + "Quitado ✓"
- Animação de contagem ao carregar

#### ExpenseCard

```typescript
interface ExpenseCardProps {
  expense: Expense;
  currentUserId: string;
  onPress: () => void;
  onLongPress?: () => void;  // para ações rápidas
}
```

Mostra:
- Título e data
- "X pagou R$ Y"
- "Você deve R$ Z" ou "Você emprestou R$ Z" (colorido)
- Avatar de quem pagou
- Ícone da categoria

#### EmptyState

```typescript
interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
}
```

#### Skeleton

Para loading states, com shimmer animation.

```typescript
interface SkeletonProps {
  variant: 'text' | 'circular' | 'rectangular' | 'card';
  width?: number | string;
  height?: number | string;
  count?: number;  // múltiplas linhas
}
```

---

## 11 · EXPERIÊNCIA DO USUÁRIO (UX)

### 11.1 Jornada do Primeiro Acesso

```mermaid
journey
    title Primeiro Acesso — Novo Usuário
    section Descoberta
      Abre o app: 5: Usuário
      Vê Splash screen: 4: Sistema
      Chega no Onboarding: 4: Usuário
    section Cadastro
      Escolhe "Continuar com Google": 5: Usuário
      Autoriza OAuth: 5: Usuário
      Define nome e moeda: 4: Usuário
    section Primeiro Grupo
      Vê empty state: 3: Usuário
      Cria primeiro grupo: 5: Usuário
      Convida amigo: 5: Usuário
    section Primeira Despesa
      Adiciona despesa: 5: Usuário
      Vê saldo atualizado: 5: Sistema
      Satisfação: 5: Usuário
```

### 11.2 Fluxo: Criar Despesa em 10 Segundos

```mermaid
sequenceDiagram
    participant U as Usuário
    participant UI as Interface
    participant SYS as Sistema

    Note over U,SYS: Objetivo: <10 segundos

    U->>UI: Toca no FAB [+]
    UI->>UI: Abre sheet (200ms animação)
    UI->>U: Foco automático no campo valor
    
    U->>UI: Digita "2000" (2s)
    UI->>UI: Formata R$ 2.000,00
    
    U->>UI: Toca "Descrição" (1s)
    U->>UI: Digita "Alu" → autocomplete "Aluguel" (1s)
    
    Note over UI: Sistema pré-seleciona:<br/>- Pago por: usuário atual<br/>- Dividido com: todos<br/>- Divisão: Igual<br/>- Data: Hoje
    
    U->>UI: Toca "Salvar" (1s)
    UI->>SYS: POST /expenses
    SYS-->>UI: 201 Created
    UI->>UI: Sheet fecha (200ms)
    UI->>U: Toast: "Despesa criada ✓"
    UI->>U: Novo card aparece na lista
    
    Note over U,SYS: ⏱ Total: ~6 segundos
```

### 11.3 Microinterações

| Interação | Comportamento |
|---|---|
| **Pull to refresh** | Puxar para baixo recarrega despesas |
| **Swipe left** no card | Revela ações: Editar, Deletar |
| **Long press** no card | Abre menu contextual |
| **Tap no saldo** | Alterna entre "valor" e "detalhamento" |
| **Shake** em erro | Input treme quando valor inválido |
| **Confetti** | Animação ao quitar todas as dívidas de um grupo |
| **Haptic feedback** | Vibração sutil ao criar/excluir despesa (mobile) |
| **Skeleton shimmer** | Placeholder animado durante carregamento |

### 11.4 Feedback e Confirmações

**Toast notifications:**
- Sucesso: Verde + check animado, some em 3s
- Erro: Vermelho + ícone, some em 5s
- Info: Azul, some em 3s

**Undo (ação reversível):**
- Após deletar despesa: Toast "Despesa removida" + botão "Desfazer" (visível por 5s)
- Desfazer reverte o soft delete

**Confirmação (ação irreversível):**
- Sair do grupo: Dialog "Tem certeza? Você deixará de ver novas despesas."
- Deletar grupo: Dialog "Esta ação não pode ser desfeita. Todas as despesas serão arquivadas."

### 11.5 Acessibilidade (WCAG 2.1 AA)

- Contraste mínimo: 4.5:1 para texto normal, 3:1 para texto grande
- Todos os elementos interativos têm `aria-label`
- Navegação completa por teclado (Tab, Enter, Escape)
- Suporte a leitores de tela (roles, labels, announcements)
- Foco visível em todos os elementos
- Textos alternativos em ícones e imagens
- Redução de movimento (`prefers-reduced-motion`)
- Tamanho mínimo de toque: 44x44px (iOS HIG) / 48x48px (Material)

### 11.6 Experiência Offline

```mermaid
stateDiagram-v2
    [*] --> Online
    Online --> Offline: Perda de conexão
    Offline --> Online: Reconexão
    
    state Offline {
        [*] --> ReadCache: App abre
        ReadCache --> QueueActions: Usuário age
        QueueActions --> ShowPending: Indicador "pendente"
    }
    
    state Online {
        [*] --> SyncPending: Reconectou
        SyncPending --> ProcessQueue: Envia fila offline
        ProcessQueue --> UpdateUI: Atualiza interface
        UpdateUI --> [*]
    }
```

---

## 12 · ALGORITMOS AVANÇADOS

### 12.1 Debt Simplification (Minimização de Transações)

Problema clássico de otimização em grafos: dado um grafo direcionado de dívidas, encontrar o conjunto mínimo de arestas que representa os mesmos saldos líquidos.

**Algoritmo (O(n log n)):**

```
function simplifyGroupDebts(groupId):
    // Passo 1: Calcular saldo líquido de cada pessoa
    net = {}
    for each expense in getActiveExpenses(groupId):
        payer = expense.paid_by
        for each participant in expense.participants:
            if participant.user_id != payer:
                net[participant.user_id] -= participant.share_amount
                net[payer] += participant.share_amount
    
    // Passo 2: Separar credores e devedores
    creditors = [(user, amount) for user, amount in net if amount > 0.001]
    debtors = [(user, amount) for user, amount in net if amount < -0.001]
    
    // Passo 3: Ordenar por valor absoluto
    sort(creditors, by amount descending)
    sort(debtors, by amount ascending)  // mais negativo primeiro
    
    // Passo 4: Algoritmo guloso de matching
    transactions = []
    i = 0  // índice de creditors
    j = 0  // índice de debtors
    
    while i < len(creditors) and j < len(debtors):
        credit_amount = creditors[i].amount
        debt_amount = abs(debtors[j].amount)
        
        transfer = min(credit_amount, debt_amount)
        
        transactions.push({
            from: debtors[j].user,
            to: creditors[i].user,
            amount: roundToCents(transfer)
        })
        
        creditors[i].amount -= transfer
        debtors[j].amount += transfer
        
        if abs(creditors[i].amount) < 0.001: i++
        if abs(debtors[j].amount) < 0.001: j++
    
    return transactions
```

### 12.2 Otimização por Programação Linear (para grupos grandes)

Para grupos com muitos membros (>20), usar subset sum para encontrar matching ótimo:

```
function optimalSettlement(netBalances):
    // NP-difícil no caso geral, mas heurísticas funcionam bem
    // Abordagem: transformar em problema de fluxo em rede
    
    // Constrói grafo bipartido
    // Fonte → credores (capacidade = crédito)
    // Credores → devedores (capacidade = ∞)
    // Devedores → sumidouro (capacidade = débito)
    
    // Executa min-cost max-flow
    // Resultado: transações ótimas
    
    return runMinCostMaxFlow(graph)
```

### 12.3 Sincronização Offline (CRDT-inspired)

```
// Cada operação offline gera um evento com:
event = {
    id: uuid(),
    type: 'EXPENSE_CREATE' | 'EXPENSE_DELETE' | 'EXPENSE_UPDATE',
    payload: { ... },
    timestamp: now(),
    deviceId: device_uuid,
    sequenceNumber: local_seq++
}

// Na reconexão:
function syncEvents(events):
    for event in sortByTimestamp(events):
        switch event.type:
            case 'EXPENSE_CREATE':
                // Verifica se já existe (idempotente)
                if not exists(event.payload.id):
                    createExpense(event.payload)
            case 'EXPENSE_UPDATE':
                // Last-write-wins com timestamp
                existing = find(event.payload.id)
                if existing.updated_at < event.timestamp:
                    updateExpense(event.payload)
            case 'EXPENSE_DELETE':
                // Soft delete
                softDeleteExpense(event.payload.id)
```

### 12.4 Conversão de Moedas

```
function convertCurrency(amount, fromCurrency, toCurrency):
    // 1. Tenta cache Redis
    cached = redis.get(`fx:${fromCurrency}:${toCurrency}`)
    if cached:
        return amount * cached.rate
    
    // 2. Busca da API externa
    rate = exchangeRateAPI.getRate(fromCurrency, toCurrency)
    
    // 3. Cache por 1 hora
    redis.set(`fx:${fromCurrency}:${toCurrency}`, rate, EX=3600)
    
    // 4. Arredonda para centavos
    converted = round(amount * rate * 100) / 100
    
    return converted
```

---

## 13 · API REFERENCE

### 13.1 Convenções

- Base URL: `https://api.leiaute.app/v1`
- Autenticação: `Authorization: Bearer <jwt>`
- Content-Type: `application/json`
- Encoding: UTF-8
- Datas: ISO 8601 (`2026-07-08T14:30:00Z`)
- Moedas: ISO 4217 (`BRL`, `USD`, `EUR`)
- Valores monetários: **centavos (integer)** no request/response

### 13.2 Endpoints

#### Auth

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/auth/register` | Cadastro |
| `POST` | `/auth/login` | Login email+senha |
| `POST` | `/auth/oauth` | OAuth callback |
| `POST` | `/auth/refresh` | Refresh token |
| `POST` | `/auth/logout` | Logout |
| `POST` | `/auth/forgot-password` | Esqueci senha |
| `POST` | `/auth/reset-password` | Redefinir senha |

#### Users

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/users/me` | Perfil do usuário logado |
| `PATCH` | `/users/me` | Atualizar perfil |
| `DELETE` | `/users/me` | Solicitar exclusão (LGPD) |
| `GET` | `/users/me/export` | Exportar dados (LGPD) |

#### Groups

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/groups` | Listar grupos do usuário |
| `POST` | `/groups` | Criar grupo |
| `GET` | `/groups/:id` | Detalhes do grupo |
| `PATCH` | `/groups/:id` | Atualizar grupo |
| `DELETE` | `/groups/:id` | Arquivar/deletar grupo |
| `POST` | `/groups/:id/invites` | Convidar membro |
| `GET` | `/groups/:id/invites` | Listar convites |
| `DELETE` | `/groups/:id/invites/:inviteId` | Cancelar convite |
| `POST` | `/groups/:id/members/:userId/role` | Alterar papel |
| `DELETE` | `/groups/:id/members/:userId` | Remover membro |
| `POST` | `/groups/:id/leave` | Sair do grupo |
| `POST` | `/groups/:id/recalc` | Recalcular saldos (admin) |

#### Expenses

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/groups/:id/expenses` | Listar despesas |
| `POST` | `/groups/:id/expenses` | Criar despesa |
| `GET` | `/groups/:id/expenses/:eid` | Detalhes da despesa |
| `PATCH` | `/groups/:id/expenses/:eid` | Editar despesa |
| `DELETE` | `/groups/:id/expenses/:eid` | Deletar despesa |
| `POST` | `/groups/:id/expenses/:eid/attachments` | Upload anexo |

#### Ledger & Balances

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/groups/:id/balances` | Saldos do grupo |
| `GET` | `/groups/:id/settlement` | Liquidação sugerida |
| `GET` | `/dashboard/summary` | Resumo financeiro |

#### Payments

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/groups/:id/payments` | Pagamentos do grupo |
| `POST` | `/groups/:id/payments` | Registrar pagamento |
| `PATCH` | `/payments/:pid` | Atualizar pagamento |

### 13.3 Exemplo: Criar Despesa

**Request:**
```http
POST /v1/groups/abc-123/expenses
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "title": "Aluguel Julho",
  "description": "Aluguel do apartamento referente a julho/2026",
  "amount": 200000,
  "currency": "BRL",
  "split_type": "EQUAL",
  "category_id": "cat-housing-001",
  "paid_by": "user-alice-uuid",
  "expense_date": "2026-07-05",
  "participants": [
    {"user_id": "user-alice-uuid"},
    {"user_id": "user-bob-uuid"},
    {"user_id": "user-carol-uuid"},
    {"user_id": "user-dave-uuid"}
  ],
  "tags": ["aluguel", "fixo"],
  "is_recurring": true,
  "recurrence": {
    "frequency": "MONTHLY",
    "day_of_month": 5
  }
}
```

**Response (201):**
```json
{
  "id": "exp-xyz-789",
  "title": "Aluguel Julho",
  "amount": 200000,
  "currency": "BRL",
  "split_type": "EQUAL",
  "paid_by": {
    "id": "user-alice-uuid",
    "display_name": "Alice",
    "avatar_url": "https://..."
  },
  "participants": [
    {
      "user": { "id": "user-alice-uuid", "display_name": "Alice" },
      "share_amount": 50000,
      "is_payer": true
    },
    {
      "user": { "id": "user-bob-uuid", "display_name": "Bob" },
      "share_amount": 50000,
      "is_payer": false
    },
    {
      "user": { "id": "user-carol-uuid", "display_name": "Carol" },
      "share_amount": 50000,
      "is_payer": false
    },
    {
      "user": { "id": "user-dave-uuid", "display_name": "Dave" },
      "share_amount": 50000,
      "is_payer": false
    }
  ],
  "created_at": "2026-07-08T14:30:00Z"
}
```

### 13.4 Paginação

```
GET /v1/groups/:id/expenses?page=2&per_page=20&sort=-created_at

Response:
{
  "data": [ ... ],
  "meta": {
    "page": 2,
    "per_page": 20,
    "total": 156,
    "total_pages": 8
  }
}
```

### 13.5 Rate Limiting

- 60 requisições/minuto por usuário (geral)
- 10 requisições/minuto para criação de despesas
- 3 tentativas de login por minuto por IP
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## 14 · BANCO DE DADOS

### 14.1 Schema SQL (PostgreSQL)

```sql
-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ENUMs
CREATE TYPE group_type AS ENUM ('PERMANENT', 'TEMPORARY', 'EVENT');
CREATE TYPE group_visibility AS ENUM ('PRIVATE', 'PUBLIC');
CREATE TYPE member_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE split_type AS ENUM ('EQUAL', 'FIXED', 'PERCENT', 'SHARES', 'ITEMIZED', 'WEIGHT', 'HYBRID');
CREATE TYPE expense_status AS ENUM ('ACTIVE', 'DELETED', 'ARCHIVED');
CREATE TYPE invite_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');
CREATE TYPE payment_method AS ENUM ('MANUAL', 'BANK_TRANSFER', 'PIX', 'CASH');
CREATE TYPE payment_status AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');
CREATE TYPE recurrence_frequency AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    display_name VARCHAR(60) NOT NULL,
    avatar_url TEXT,
    default_currency CHAR(3) DEFAULT 'BRL',
    locale VARCHAR(10) DEFAULT 'pt-BR',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    preferences JSONB DEFAULT '{}',
    email_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- OAuth Accounts
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL, -- 'google', 'apple', 'microsoft'
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

-- Sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500) UNIQUE NOT NULL,
    device_info TEXT,
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);

-- Groups
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type group_type DEFAULT 'PERMANENT',
    visibility group_visibility DEFAULT 'PRIVATE',
    default_currency CHAR(3) DEFAULT 'BRL',
    created_by UUID NOT NULL REFERENCES users(id),
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_groups_created_by ON groups(created_by);

-- Group Members
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role member_role DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members(group_id) WHERE left_at IS NULL;
CREATE INDEX idx_group_members_user ON group_members(user_id) WHERE left_at IS NULL;

-- Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    amount NUMERIC(18,6) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL,
    split_type split_type NOT NULL,
    category_id UUID REFERENCES categories(id),
    status expense_status DEFAULT 'ACTIVE',
    paid_by UUID NOT NULL REFERENCES users(id),
    expense_date DATE NOT NULL,
    location TEXT,
    tags JSONB DEFAULT '[]',
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_expenses_group ON expenses(group_id, expense_date DESC) WHERE status = 'ACTIVE';
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by, expense_date DESC);
CREATE INDEX idx_expenses_category ON expenses(category_id);

-- Expense Participants
CREATE TABLE expense_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    share_amount NUMERIC(18,6) NOT NULL,
    share_percentage NUMERIC(5,2),
    shares INTEGER DEFAULT 1,
    weight NUMERIC(10,4) DEFAULT 1.0,
    is_payer BOOLEAN DEFAULT FALSE,
    UNIQUE(expense_id, user_id)
);

CREATE INDEX idx_exp_participants_expense ON expense_participants(expense_id);
CREATE INDEX idx_exp_participants_user ON expense_participants(user_id);

-- Expense Splits (itemized)
CREATE TABLE expense_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES expense_participants(id) ON DELETE CASCADE,
    item_name VARCHAR(200),
    item_amount NUMERIC(18,6),
    quantity INTEGER DEFAULT 1
);

-- Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10),
    color VARCHAR(7),
    parent_id UUID REFERENCES categories(id),
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ledger (saldo entre pares)
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    counterparty_id UUID NOT NULL REFERENCES users(id),
    balance NUMERIC(18,6) DEFAULT 0, -- positivo = user_id tem a receber de counterparty_id
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    is_current BOOLEAN DEFAULT TRUE,
    UNIQUE(group_id, user_id, counterparty_id)
);

CREATE INDEX idx_ledger_group ON ledger_entries(group_id) WHERE is_current;
CREATE INDEX idx_ledger_user ON ledger_entries(user_id) WHERE is_current;

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id UUID NOT NULL REFERENCES users(id),
    to_user_id UUID NOT NULL REFERENCES users(id),
    group_id UUID REFERENCES groups(id),
    amount NUMERIC(18,6) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL,
    method payment_method DEFAULT 'MANUAL',
    status payment_status DEFAULT 'PENDING',
    paid_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_group ON payments(group_id);
CREATE INDEX idx_payments_from ON payments(from_user_id);
CREATE INDEX idx_payments_to ON payments(to_user_id);

-- Invites
CREATE TABLE invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    status invite_status DEFAULT 'PENDING',
    invited_by UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_email ON invites(email);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_user_unread ON notifications(user_id, created_at DESC) WHERE NOT is_read;

-- Attachments
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    file_url TEXT NOT NULL,
    file_type VARCHAR(20),
    file_size BIGINT,
    original_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_group ON activity_logs(group_id, created_at DESC);

-- Edit History
CREATE TABLE expense_edit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    edited_by UUID NOT NULL REFERENCES users(id),
    changes JSONB NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recurrence Rules
CREATE TABLE recurrence_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    frequency recurrence_frequency NOT NULL,
    interval INTEGER DEFAULT 1,
    day_of_month INTEGER,
    day_of_week INTEGER,
    start_date DATE NOT NULL,
    end_date DATE,
    total_occurrences INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 14.2 Índices Adicionais

```sql
-- Para busca textual (pg_trgm)
CREATE INDEX idx_users_name_trgm ON users USING GIN (display_name gin_trgm_ops);
CREATE INDEX idx_groups_name_trgm ON groups USING GIN (name gin_trgm_ops);
CREATE INDEX idx_expenses_title_trgm ON expenses USING GIN (title gin_trgm_ops);

-- Para filtros compostos
CREATE INDEX idx_expenses_group_date ON expenses(group_id, expense_date DESC, status);
```

### 14.3 Views Materializadas

```sql
-- Saldo líquido por usuário (denormalizado para performance)
CREATE MATERIALIZED VIEW mv_user_balances AS
SELECT
    le.user_id,
    SUM(CASE WHEN le.balance > 0 THEN le.balance ELSE 0 END) AS total_owed_to_me,
    SUM(CASE WHEN le.balance < 0 THEN ABS(le.balance) ELSE 0 END) AS total_i_owe,
    SUM(le.balance) AS net_balance
FROM ledger_entries le
WHERE le.is_current = TRUE
GROUP BY le.user_id;

-- Refresh a cada 5 minutos ou sob demanda
CREATE UNIQUE INDEX idx_mv_balances_user ON mv_user_balances(user_id);
```

### 14.4 Migrations

Ferramenta: [node-pg-migrate](https://github.com/salsita/node-pg-migrate)

```
migrations/
  001_create_users.sql
  002_create_oauth_accounts.sql
  003_create_sessions.sql
  004_create_groups.sql
  005_create_group_members.sql
  006_create_categories.sql
  007_create_expenses.sql
  008_create_expense_participants.sql
  009_create_expense_splits.sql
  010_create_ledger.sql
  011_create_payments.sql
  012_create_invites.sql
  013_create_notifications.sql
  014_create_attachments.sql
  015_create_activity_logs.sql
  016_create_edit_history.sql
  017_create_recurrence_rules.sql
  018_create_indexes.sql
  019_create_views.sql
```

---

## 15 · SEGURANÇA

### 15.1 Autenticação

- **bcrypt** (cost factor 12) para hash de senhas
- **JWT RS256** (chave assimétrica) para access tokens
- **Refresh tokens** são opacos (UUID v4), armazenados com hash SHA-256
- **Rate limiting** progressivo no login (3 → 10 → 30 tentativas)

### 15.2 Autorização (RBAC)

Cada requisição passa por middleware de autorização:

```
function authorize(requiredRole):
    return (req, res, next) => {
        user = req.user
        groupId = req.params.groupId
        
        membership = db.group_members.findOne({
            group_id: groupId,
            user_id: user.id,
            left_at: null
        })
        
        if not membership:
            return 403
        
        if roleHierarchy[membership.role] < roleHierarchy[requiredRole]:
            return 403
        
        next()
    }
```

### 15.3 Proteções

| Ameaça | Proteção |
|---|---|
| SQL Injection | Parameterized queries (100% — nunca string concat) |
| XSS | Content-Security-Policy header, output escaping |
| CSRF | SameSite=Strict cookies, CSRF token no state OAuth |
| Clickjacking | X-Frame-Options: DENY |
| MITM | HSTS (Strict-Transport-Security) |
| Enumeração de email | Mensagem genérica: "Se este email existir, enviamos instruções" |
| IDOR | Toda query verifica se o recurso pertence ao grupo do usuário |
| Rate Limit | 60 req/min geral, 10 req/min criação, fila para bursts |

### 15.4 Logs de Auditoria

```json
{
  "timestamp": "2026-07-08T14:30:00Z",
  "user_id": "uuid",
  "action": "EXPENSE_DELETED",
  "resource": "expenses/xyz-789",
  "ip": "192.168.1.1",
  "user_agent": "...",
  "changes": {
    "before": { "status": "ACTIVE" },
    "after": { "status": "DELETED" }
  }
}
```

### 15.5 LGPD — Implementação Técnica

1. **Anonimização:** Ao deletar conta, `users.deleted_at = NOW()`, campos PII são substituídos por `[REDACTED]`
2. **Exportação:** Endpoint `GET /users/me/export` retorna JSON com todos os dados do usuário
3. **Job de limpeza:** Roda a cada 24h e deleta permanentemente contas com `deleted_at > 30 dias`
4. **Consentimento:** Registro de consentimento em tabela separada

---

## 16 · ESCALABILIDADE E INFRAESTRUTURA

### 16.1 Arquitetura de Deployment

```mermaid
graph TB
    subgraph "Edge"
        DNS[Route 53 / Cloudflare DNS]
        CDN[Cloudflare CDN]
    end

    subgraph "Kubernetes Cluster"
        subgraph "Ingress"
            ING[NGINX Ingress Controller]
        end
        
        subgraph "Services"
            API1[API Pod 1]
            API2[API Pod 2]
            API3[API Pod N...]
            WS[WebSocket Pods]
            WORKER[Worker Pods<br/>BullMQ Consumers]
            CRON[Cron Jobs<br/>Recurring Expenses]
        end
        
        subgraph "Service Mesh"
            SM[Linkerd / Istio]
        end
    end

    subgraph "Data"
        PG_PRIM[PostgreSQL<br/>Primary]
        PG_REPL[PostgreSQL<br/>Read Replica]
        REDIS[Redis Cluster<br/>Cache + Queue]
        S3[Cloudflare R2<br/>Object Storage]
    end

    subgraph "Observability"
        OTEL[OpenTelemetry Collector]
        TEMPO[Grafana Tempo<br/>Tracing]
        PROM[Prometheus<br/>Metrics]
        LOKI[Grafana Loki<br/>Logs]
        GRAF[Grafana<br/>Dashboards]
    end

    CDN --> ING
    ING --> API1
    ING --> API2
    ING --> API3
    ING --> WS

    API1 --> PG_PRIM
    API2 --> PG_PRIM
    API3 --> PG_PRIM
    API1 --> PG_REPL
    API2 --> PG_REPL
    API3 --> PG_REPL

    API1 --> REDIS
    WS --> REDIS

    WORKER --> REDIS
    WORKER --> PG_PRIM
    WORKER --> S3

    CRON --> PG_PRIM

    API1 --> OTEL
    API2 --> OTEL
    API3 --> OTEL
    OTEL --> TEMPO
    OTEL --> PROM
    OTEL --> LOKI
    TEMPO --> GRAF
    PROM --> GRAF
    LOKI --> GRAF
```

### 16.2 Estratégia de Cache

| Dado | Cache | TTL | Invalidação |
|---|---|---|---|
| Saldo do usuário | Redis `balance:{userId}` | 5 min | Invalida ao criar/editar despesa |
| Detalhes do grupo | Redis `group:{groupId}` | 10 min | Invalida ao editar grupo |
| Taxas de câmbio | Redis `fx:{from}:{to}` | 1 hora | Natural |
| Sessões | Redis `session:{token}` | 15 min | Invalida no logout |
| Rate limit | Redis `rate:{userId}:{endpoint}` | 1 min | Natural |
| Liquidação sugerida | Redis `settlement:{groupId}` | 5 min | Invalida ao criar/editar despesa |

### 16.3 Filas (BullMQ)

| Fila | Job Types | Concorrência |
|---|---|---|
| `notifications` | push, email, in-app | 10 |
| `expenses` | recurring_generation, ocr_scan | 5 |
| `exports` | csv_export, pdf_export | 3 |
| `maintenance` | clean_sessions, clean_notifications, recalc_audit | 1 |

### 16.4 WebSocket — Eventos

| Evento | Payload | Quem Recebe |
|---|---|---|
| `expense:created` | `{ expense, groupId }` | Todos do grupo |
| `expense:updated` | `{ expense, groupId }` | Todos do grupo |
| `expense:deleted` | `{ expenseId, groupId }` | Todos do grupo |
| `balance:updated` | `{ balances, groupId }` | Todos do grupo |
| `payment:confirmed` | `{ payment, groupId }` | from_user, to_user |
| `member:joined` | `{ user, groupId }` | Todos do grupo |
| `member:left` | `{ user, groupId }` | Todos do grupo |
| `sync:ready` | `{ lastSyncTimestamp }` | Cliente específico |

### 16.5 Observabilidade

**Métricas chave (Prometheus):**
- `http_request_duration_seconds` (histogram por endpoint)
- `http_requests_total` (counter por status code)
- `expense_creations_total` (counter)
- `active_users` (gauge)
- `ledger_recalc_duration_seconds` (histogram)
- `db_connections_active` (gauge)
- `redis_operations_total` (counter)
- `websocket_connections` (gauge)

**Alertas (Grafana + AlertManager):**
- Latência p95 > 500ms por >5min
- Taxa de erro > 1% por >5min
- Conexões DB > 80% do pool
- CPU > 80% por >10min
- Disco < 20% livre

---

## 17 · FUNCIONALIDADES PREMIUM & DIFERENCIAIS

### 17.1 OCR de Recibos (AI-Powered)

Usuário tira foto do recibo → IA extrai automaticamente:

- 💰 Valor total
- 📅 Data
- 🏷 Categoria sugerida
- 🍕 Itens individuais (para divisão itemizada)
- 🏪 Nome do estabelecimento

**Implementação:** Google Cloud Vision API + GPT-4o / Claude Vision

### 17.2 Importação de Extratos

- Upload de PDF/CSV de extrato bancário
- Parse automático de transações
- Sugestão de despesas correspondentes
- Matching inteligente de participantes

### 17.3 Sugestões Inteligentes

- **Participantes frequentes:** Se 80% das despesas de "Aluguel" incluem Bob e Carol, o sistema pré-seleciona esses participantes
- **Categoria automática:** "Aluguel" → 🏠, "Ifood" → 🍕, "Uber" → 🚗
- **Divisão inteligente:** Se sempre divide "Aluguel" igualmente, pré-seleciona EQUAL

### 17.4 Chat do Grupo

- Canal de comunicação integrado ao grupo
- Menções a despesas específicas
- Resolução de conflitos inline
- Reações e threads

### 17.5 Aprovação de Despesas

- Modo "approval required" para grupos
- Despesas precisam de aprovação de admin antes de entrar no ledger
- Workflow: pending → approved → active

### 17.6 Orçamentos e Metas

- Definir orçamento mensal por grupo ou categoria
- Alertas quando próximo do limite (80%, 90%, 100%)
- Metas de economia compartilhadas

### 17.7 Exportações

- **CSV:** Exportação simples de despesas
- **Excel:** Com fórmulas e formatação
- **PDF:** Relatório formatado com gráficos
- **API Pública:** Para integrações customizadas

### 17.8 Integrações

| Plataforma | Funcionalidade |
|---|---|
| **Slack** | Notificações de despesas, comandos `/split` |
| **Discord** | Bot de despesas para comunidades |
| **Google Calendar** | Despesas recorrentes como eventos |
| **Notion** | Sincronização de despesas com databases |
| **WhatsApp** | Bot para registrar despesas por mensagem |
| **Telegram** | Bot com comandos rápidos |

### 17.9 Webhooks

Eventos configuráveis para sistemas externos:

```json
{
  "event": "expense.created",
  "url": "https://meu-sistema.com/webhooks/leiaute",
  "secret": "whsec_..."
}
```

### 17.10 Insights e Relatórios

- **Relatório mensal:** Para onde foi meu dinheiro?
- **Comparativo:** Este mês vs mês passado
- **Previsão:** Gastos projetados baseados em recorrências
- **Score de economia:** Quanto deixou de gastar vs média
- **Insights IA:** "Você gastou 30% mais com delivery este mês"

---

## 18 · IDENTIDADE VISUAL & DESIGN

### 18.1 Direção Criativa

**Nome:** Leiaute

**Conceito:** Um espaço limpo e organizado para suas finanças compartilhadas. Como uma mesa bem arrumada antes de começar a trabalhar.

**Personalidade da marca:**
- 🤝 Confiável mas não frio
- ✨ Sofisticado mas não elitista
- 🎯 Preciso mas não burocrático
- 😌 Calmo mas não monótono

### 18.2 Mood Board Conceitual

Inspirações por elemento:

| Elemento | Inspiração | Por quê |
|---|---|---|
| **Layout** | Linear | Navegação minimalista, comandos por teclado |
| **Tipografia** | Apple | Inter, hierarquia clara, legibilidade |
| **Cards** | Notion | Cantos suaves, hover sutil, organização flexível |
| **Cores** | Stripe | Gradientes sutis, fundos escuros premium |
| **Inputs** | Revolut | Máscaras inteligentes, animações de foco |
| **Ícones** | Raycast | Lucide Icons, traço consistente e fino |
| **Modo escuro** | Arc Browser | Tons profundos, contraste confortável |

### 18.3 Paleta de Cores — Light Mode

```
Background Hierarchy:
  Page:           #FAFAFA  (quase branco, levemente quente)
  Surface:        #FFFFFF  (branco puro, cards e sheets)
  Elevated:       #FFFFFF  (modais, dropdowns)

Text Hierarchy:
  Primary:        #0A0A0A  (quase preto, alto contraste)
  Secondary:      #5C5C5C  (cinza médio)
  Tertiary:       #999999  (cinza claro, placeholders)
  Disabled:       #CCCCCC

Brand:
  Primary:        #0A0A0A  (preto, ações principais)
  Accent:         #2563EB  (azul, links e CTAs)
  Accent Soft:    #EFF6FF  (fundo azul claro)

Semantic:
  Success:        #059669  (verde esmeralda)
  Success Soft:   #ECFDF5  (fundo verde claro)
  Warning:        #D97706  (âmbar)
  Warning Soft:   #FFFBEB  (fundo âmbar claro)
  Danger:         #DC2626  (vermelho)
  Danger Soft:    #FEF2F2  (fundo vermelho claro)

Borders:
  Default:        #E5E5E5
  Strong:         #D4D4D4
  Hover:          #A3A3A3
```

### 18.4 Paleta — Dark Mode

```
Background Hierarchy:
  Page:           #0A0A0A
  Surface:        #141414
  Elevated:       #1F1F1F

Text Hierarchy:
  Primary:        #EDEDED
  Secondary:      #A0A0A0
  Tertiary:       #6B6B6B
  Disabled:       #404040

Brand:
  Accent:         #3B82F6
  Accent Soft:    #1E293B

Semantic:
  Success:        #34D399
  Danger:         #F87171
  Warning:        #FBBF24

Borders:
  Default:        #262626
  Strong:         #333333
  Hover:          #404040
```

### 18.5 Tipografia

**Família:** [Inter](https://rsms.me/inter/) (principal), [JetBrains Mono](https://www.jetbrains.com/lp/mono/) (valores e monospace)

**Escala tipográfica (Major Third — 1.25):**

| Nome | Size/Line | Weight | Uso |
|---|---|---|---|
| `caption` | 12/16 | 400 | Labels, badges |
| `body-sm` | 14/20 | 400 | Texto secundário |
| `body` | 16/24 | 400 | Texto corrido |
| `body-lg` | 18/28 | 400 | Texto destacado |
| `heading-6` | 18/28 | 600 | Subtítulos |
| `heading-5` | 20/28 | 600 | Títulos de seção |
| `heading-4` | 24/32 | 600 | Títulos de card |
| `heading-3` | 30/36 | 700 | Títulos de página |
| `heading-2` | 36/44 | 700 | Títulos grandes |
| `heading-1` | 48/56 | 700 | Hero, onboarding |
| `balance-lg` | 40/48 | 700 | Saldos (JetBrains Mono) |
| `balance-md` | 28/36 | 600 | Saldos em cards |
| `balance-sm` | 20/28 | 500 | Saldos inline |

### 18.6 Ícones

- **Biblioteca:** [Lucide Icons](https://lucide.dev/)
- **Tamanhos:** 16px (inline), 20px (UI), 24px (navigation)
- **Stroke:** 1.5px (padrão), 2px (ações)

### 18.7 Espaçamento (8px Grid System)

Todas as medidas são múltiplas de 4px, com preferência por 8px.

```
xs:  4px
sm:  8px
md:  12px
lg:  16px
xl:  24px
2xl: 32px
3xl: 48px
4xl: 64px
```

### 18.8 Animações e Transições

| Elemento | Timing | Easing |
|---|---|---|
| Page transition | 200ms | ease-out |
| Modal open | 200ms | cubic-bezier(0.16,1,0.3,1) |
| Modal close | 150ms | ease-in |
| Hover | 100ms | ease |
| Toast enter | 300ms | spring-like |
| Toast exit | 200ms | ease-in |
| Skeleton shimmer | 1.5s | loop |
| Number counter | 600ms | ease-out |

### 18.9 Breakpoints Responsivos

```
Mobile:        0 - 639px    (base, mobile-first)
Tablet:        640 - 1023px
Desktop:       1024 - 1279px
Wide:          1280px+
```

### 18.10 Motion Design Principles

1. **Rápido e responsivo:** Animações nunca devem atrasar a interação
2. **Propósito:** Toda animação comunica algo (hierarquia, feedback, navegação)
3. **Natural:** Curvas de easing imitam física do mundo real
4. **Respeitar preferências:** `prefers-reduced-motion: reduce` remove animações não essenciais

---

## APÊNDICE A — Glossário

| Termo | Definição |
|---|---|
| **Ledger** | Livro-razão: registro de saldos entre pares |
| **Settlement** | Liquidação: processo de quitar dívidas |
| **Split** | Divisão: como uma despesa é rateada |
| **Payer** | Quem pagou a despesa originalmente |
| **Participant** | Quem participa (consome) da despesa |
| **Share** | Parte que cabe a cada participante |
| **Balance** | Saldo líquido entre duas pessoas |
| **Debt Simplification** | Algoritmo que minimiza número de transações |
| **Soft Delete** | Exclusão lógica (marca como deletado sem remover) |
| **FAB** | Floating Action Button |

---

## APÊNDICE B — Decisões de Arquitetura (ADR)

### ADR-001: Valores monetários em centavos

**Decisão:** Todos os valores monetários são armazenados e transmitidos como inteiros (centavos).

**Justificativa:** Evita erros de ponto flutuante (0.1 + 0.2 = 0.30000000000000004). Operações financeiras exigem precisão exata.

### ADR-002: Soft delete para despesas

**Decisão:** Despesas nunca são deletadas fisicamente; são marcadas como `DELETED`.

**Justificativa:** Integridade do ledger. Se uma despesa sumisse, os saldos ficariam inconsistentes. O soft delete permite reverter o impacto no ledger.

### ADR-003: Reverse + Recreate para edição

**Decisão:** Editar uma despesa reverte a antiga e cria uma nova, em vez de atualizar in-place.

**Justificativa:** Simplicidade do motor financeiro. Atualizar in-place exigiria diff complexo; reverse+recreate reusa as mesmas funções testadas.

### ADR-004: JWT com RS256

**Decisão:** Assinatura assimétrica (RSA) em vez de simétrica (HMAC).

**Justificativa:** Permite que múltiplos serviços validem tokens sem compartilhar segredo. Essencial para arquitetura de microserviços futura.

---

## APÊNDICE C — Estimativas e Roadmap

### Fase 1 — MVP (8 semanas)

- Auth (email + Google)
- Grupos (criar, convidar, gerenciar)
- Despesas (criar, equal split, deletar)
- Ledger básico (cálculo de saldos)
- Dashboard simples
- Web app responsivo

### Fase 2 — Core (6 semanas)

- Todos os tipos de split
- Pagamentos e liquidação
- Debt simplification
- Atividades e notificações
- Mobile PWA
- Export CSV

### Fase 3 — Premium (8 semanas)

- OCR de recibos
- Despesas recorrentes
- Chat do grupo
- Relatórios e insights
- Apps nativos (iOS/Android)
- Integrações (Slack, WhatsApp)

### Fase 4 — Scale (contínuo)

- API pública
- Webhooks
- Multi-tenant enterprise
- White label
- Marketplace de integrações

---

> **Fim da documentação.** Este documento deve ser tratado como a fonte da verdade para todas as decisões de produto, design e engenharia do Leiaute. Qualquer ambiguidade deve ser resolvida com base nos princípios e regras aqui estabelecidos.
