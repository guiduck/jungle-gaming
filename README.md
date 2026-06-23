# Goat Run

[![Stack](https://img.shields.io/badge/stack-NestJS%20%2B%20React%20%2B%20RabbitMQ-46f19c.svg)](#tech-stack)
[![Tests](https://img.shields.io/badge/tests-Bun%20%2B%20Vitest%20%2B%20Playwright-4b32c3.svg)](#validacao)
[![Deploy](https://img.shields.io/badge/deploy-Docker%20Compose%20%2B%20GitHub%20Actions-f5c84c.svg)](#ci-e-deploy)

**Goat Run** e um Crash Game multiplayer em tempo real feito para o desafio full-stack da
Jungle Gaming.

A regra e simples: Nina, a cabra, sobe a montanha enquanto o multiplicador sobe junto. O jogador
aposta antes da subida, marca pronto e precisa sacar antes do crash. Se sacar a tempo, recebe
`aposta x multiplicador`; se esperar demais, perde a aposta.

O servidor e autoritativo: ele controla rodada, aposta, cashout, carteira, RabbitMQ, WebSocket e
verificacao provably fair. O frontend e uma projecao jogavel e animada desse estado.

## Table of Contents

- [Demo](#demo)
- [Como Rodar](#como-rodar)
  - [Pre-requisitos](#pre-requisitos)
  - [Modo Demo](#modo-demo)
  - [Modo Producao Local](#modo-producao-local)
- [Como Jogar](#como-jogar)
- [Tech Stack](#tech-stack)
- [Arquitetura](#arquitetura)
- [Extras Entregues](#extras-entregues)
- [Trechos de Implementacao](#trechos-de-implementacao)
- [Validacao](#validacao)
- [Links Locais](#links-locais)
- [CI e Deploy](#ci-e-deploy)
- [Documentacao](#documentacao)
- [O Que Ficou Para Depois](#o-que-ficou-para-depois)

## Demo

Depois de subir o projeto, acesse:

```text
http://localhost:3000
```

Credenciais do jogador:

```text
Usuario: player
Senha: player123
```

O modo demo usa rodada deterministica para smoke test. Por isso o crash padrao aparece em `4.66x`.
No modo producao local, as rodadas usam seeds aleatorias do servidor e o resultado varia.

## Como Rodar

### Pre-requisitos

- Docker Desktop aberto e pronto.
- Node.js 20 ou mais novo.
- Terminal aberto na raiz do projeto.

Instale as dependencias uma vez:

```bash
npm install
```

Nao precisa copiar `.env` para rodar com Docker Compose. O projeto usa os arquivos locais do desafio:

- `services/games/.env.example`
- `services/wallets/.env.example`

### Modo Demo

Use este modo para apresentacao e validacao repetivel:

```bash
npm run demo:up
```

Ele sobe PostgreSQL, RabbitMQ, Keycloak, Kong, Games, Wallets, Frontend e migrations.

### Modo Producao Local

Use este modo para jogar localmente sem crash fixo:

```bash
npm run docker:up
```

Se quiser trocar de modo, pare a stack atual antes:

```bash
npm run docker:down
```

## Como Jogar

1. Abra `http://localhost:3000`.
2. Clique em **Entrar com Keycloak**.
3. Faca login com `player` / `player123`.
4. Escolha o valor da aposta.
5. Opcionalmente configure auto-cashout ou Auto Bet.
6. Aposte enquanto a rodada estiver aberta.
7. Clique em **Pronto para comecar**.
8. Saque antes do crash.

Atalhos:

- `H`: mostrar comandos.
- `B`: apostar.
- `C`: cashout.
- `A`: ligar/desligar auto-cashout antes de apostar.
- `[` e `]`: diminuir/aumentar a aposta.

## Tech Stack

- **Frontend**: Vite, React, TypeScript, TanStack Query, Zustand, CSS modular por area.
- **Backend**: NestJS, TypeScript strict, DDD, MikroORM.
- **Banco**: PostgreSQL 18.
- **Mensageria**: RabbitMQ.
- **Gateway**: Kong DB-less.
- **Auth**: Keycloak com Authorization Code + PKCE.
- **Tempo real**: NestJS WebSocket Gateway + Socket.IO client.
- **Testes**: Bun test runner, Vitest, Playwright smoke.
- **Infra**: Docker Compose, GitHub Actions, deploy opcional para VPS.

## Arquitetura

```text
frontend/                # Vite React app
  src/
    components/          # telas, cena, modais e paineis
    components/game-panels/
    hooks/               # queries, mutations, socket, shortcuts, dialogos e animacao
    services/            # API, auth, auto-bet, formatadores
    stores/              # Zustand
    styles/              # CSS por area

services/
  games/
    src/domain/          # Round, Bet, value objects e regras do jogo
    src/application/     # casos de uso, ports e runner
    src/infrastructure/  # MikroORM, RabbitMQ, WebSocket publisher
    src/presentation/    # controllers, DTOs, guards, gateway
  wallets/
    src/domain/          # Wallet, Money, PlayerId
    src/application/     # operacoes e ports
    src/infrastructure/  # MikroORM, RabbitMQ, system adapters
    src/presentation/    # controllers e guards

docker/                  # Kong, Keycloak e PostgreSQL init
scripts/                 # demo e smoke checks
specs/                   # artefatos Spec Kit
docs/                    # arquitetura, handoff, roadmap e decisoes
```

Separacao principal:

- `Game Service` decide rodada, apostas, crash, cashout e verificacao.
- `Wallet Service` decide saldo, debito, credito e idempotencia monetaria.
- Game e Wallet conversam por RabbitMQ no fluxo principal.
- Dinheiro usa centavos inteiros; multiplicadores usam basis points.

## Extras Entregues

Extras pedidos no desafio e entregues neste projeto:

- **Auto cashout**: jogador define multiplicador alvo; o servidor executa antes do crash.
- **Auto Bet**: frontend suporta valor fixo, Martingale e stop-loss configuravel.
- **Leaderboard**: ranking read-only por payout/multiplicador realizado.
- **Seed deterministica para testes**: modo demo reproduz crash `4.66x` para smoke estavel.
- **CI pipeline**: GitHub Actions com typecheck, testes, build, Compose build e smoke full-stack.
- **Playwright**: `npm run smoke:browser` valida welcome publico, Keycloak PKCE e shell autenticada.
- **Rate limiting**: Kong aplica limite por IP no gateway.
- **Deploy opcional VPS**: workflow manual/pos-CI para `jungle.gfig.space`.
- **Storybook oficial implementado**: React/Vite Storybook com stories reais, acessivel na rota
  `/storybook`.
- **Polish de UX**: Nina, montanha procedural, atalhos, modal de comandos e layout responsivo.

Extras explicitamente deixados para depois:

- Outbox/inbox transacional.
- OpenTelemetry + Prometheus + Grafana.
- Efeitos sonoros.

## Trechos de Implementacao

Auto cashout fica no dominio do jogo, nao no frontend:

```ts
// services/games/src/domain/entities/round.ts
autoCashOutEligibleBets(currentMultiplierBps: number): CashoutResult[] {
  if (this.statusValue !== "running") {
    return [];
  }

  return this.bets
    .filter((bet) => bet.canAutoCashOut(currentMultiplierBps, this.crashPoint.multiplierBps))
    .map((bet) => {
      const multiplierBps = bet.autoCashoutMultiplierBps ?? currentMultiplierBps;
      const payout = bet.cashOut(multiplierBps, "auto");
      return {
        betId: bet.id,
        playerId: bet.playerId.value,
        multiplierBps,
        payoutCents: payout.cents,
        cashoutTrigger: "auto" as const,
        autoCashoutMultiplierBps: bet.autoCashoutMultiplierBps,
      };
    });
}
```

Auto Bet e Martingale ficam como regra pequena e testavel no frontend:

```ts
// frontend/src/services/auto-bet.ts
const nextAmountCents =
  config.strategy === "martingale" && profitCents < 0
    ? clampAutoBetAmount(config.currentAmountCents * 2)
    : config.baseAmountCents;

return {
  ...config,
  enabled: config.enabled && !reachedStopLoss,
  accumulatedLossCents,
  currentAmountCents: reachedStopLoss ? config.baseAmountCents : nextAmountCents,
};
```

Rate limiting e smoke browser ficam versionados na infra/CI:

```ts
// frontend/src/components/game-panels/GamePanels.stories.tsx
export const BettingOpen: Story = {
  render: () => (
    <BettingControls
      amountCents={500}
      autoBetEnabled={true}
      autoBetStrategy="martingale"
      autoCashoutEnabled={true}
      autoCashoutTarget="1.80"
      round={bettingRound}
      onBetSubmit={noopSubmit}
      onCashout={noop}
      onReady={noop}
    />
  ),
};
```

O Docker build tambem gera o artefato estatico do Storybook:

```dockerfile
# frontend/Dockerfile
RUN bun run build-storybook
```

```yaml
# docker/kong/kong.yml
plugins:
  - name: rate-limiting
    config:
      minute: 120
      policy: local
      limit_by: ip
```

```yaml
# .github/workflows/ci.yml
- name: Start deterministic demo stack
  run: npm run demo:up
- name: Run API smoke
  run: npm run smoke:api
- name: Run browser auth smoke
  run: npm run smoke:browser
```

## Validacao

Comandos principais:

```bash
npx tsc -p services/games/tsconfig.json --noEmit
npx tsc -p services/wallets/tsconfig.json --noEmit
npx tsc -p frontend/tsconfig.json --noEmit
npm --workspace frontend run test
npm --workspace frontend run build
npm --workspace frontend run build-storybook
npm --workspace @crash/games run test
npm --workspace @crash/games run test:e2e
npm --workspace @crash/wallets run test
npm --workspace @crash/wallets run test:e2e
npm run smoke:api
npm run smoke:browser
docker compose config --quiet
```

Se o Playwright pedir Chromium:

```bash
npx playwright install chromium
```

## Links Locais

- Jogo: `http://localhost:3000`
- Storybook implementado: `http://localhost:3000/storybook`
- Kong: `http://localhost:8000`
- Swagger Games: `http://localhost:4001/docs`
- Swagger Wallets: `http://localhost:4002/docs`
- Keycloak: `http://localhost:8080`
- RabbitMQ Management: `http://localhost:15672`

Credenciais uteis:

```text
Jogo:
Usuario: player
Senha: player123

Keycloak admin:
Usuario: admin
Senha: admin

RabbitMQ:
Usuario: admin
Senha: admin
```

## CI e Deploy

O projeto tem dois workflows principais:

- `CI`: roda frontend, services, smoke scripts, Compose build e smoke full-stack.
- `Deploy VPS`: atualiza a VPS por SSH, reconstrui a stack Docker Compose e verifica
  `https://jungle.gfig.space/`.

Depois do deploy, o Storybook implementado fica acessivel no mesmo frontend:

```text
https://jungle.gfig.space/storybook
```

Para o deploy VPS, configure:

- secret `VPS_SSH_PRIVATE_KEY`
- variavel opcional `VPS_HOST` (padrao `216.158.236.156`)
- variavel opcional `VPS_USER` (padrao `root`)
- variavel opcional `VPS_PATH` (padrao `/opt/jungle-gaming`)

## Documentacao

- `docs/overview.md`: visao geral.
- `docs/architecture.md`: arquitetura.
- `docs/domain-model.md`: regras de dominio.
- `docs/architecture-decisions.md`: decisoes tecnicas.
- `docs/handoff.md`: estado atual e validacoes.
- `docs/roadmap.md`: roadmap.
- `docs/next-spec-prompt.md`: proximo prompt opcional.

## O Que Ficou Para Depois

O projeto esta pronto para revisao local do desafio e inclui extras relevantes. Ainda nao e uma
producao hospedada com hardening completo.

Ficou para evolucao futura:

- outbox/inbox transacional;
- observabilidade profunda;
- suite Playwright mais ampla;
- efeitos sonoros;
- hardening operacional completo da VPS.
