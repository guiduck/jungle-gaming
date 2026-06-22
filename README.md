# Jungle Crash Game

Este projeto e um jogo de crash multiplayer em tempo real feito para o desafio full-stack senior da
Jungle Gaming.

A ideia do jogo e simples: uma cabra sobe uma montanha enquanto o multiplicador aumenta. Voce aposta
antes da subida comecar e tenta sacar antes da rodada "crashar". O backend e quem manda na rodada, na
aposta, no saque, na carteira e na verificacao provably fair.

## O Que Tem Aqui

- Games service: NestJS, regras do jogo, rodadas, apostas, cashout, WebSocket, Swagger e testes.
- Wallets service: NestJS, carteira, debito de aposta, credito de premio, RabbitMQ, Swagger e
  testes.
- Frontend: Vite, React, Tailwind CSS, TanStack Query, Zustand, login Keycloak, tela do jogo,
  historico, ranking, minhas apostas e painel de verificacao.
- Infra local: Docker Compose com PostgreSQL, RabbitMQ, Keycloak, Kong, Games, Wallets, migracoes e
  frontend.

## Antes De Comecar

Pense nisso como arrumar a mesa antes de brincar:

1. Abra o Docker Desktop.
2. Espere o Docker Desktop ficar pronto.
3. Instale Node.js 20 ou mais novo, se ainda nao tiver.
4. Tenha o npm disponivel.
5. Abra um terminal nesta pasta do projeto.

Se for a primeira vez neste computador, rode:

```bash
npm install
```

Voce nao precisa copiar `.env`. O projeto ja vem com os arquivos locais necessarios:

- `services/games/.env.example`
- `services/wallets/.env.example`

Esses arquivos usam credenciais locais de desafio, como `admin/admin`, e nao guardam segredo real de
producao.

## Modo Demo

Use este modo para avaliar o projeto, mostrar para alguem ou conferir se tudo esta funcionando do
mesmo jeito em toda execucao.

### Como Rodar

1. Abra o Docker Desktop.
2. No terminal, dentro da pasta do projeto, rode:

```bash
npm run demo:up
```

3. Espere o terminal terminar e mostrar os links.
4. Abra o jogo no navegador:

```text
http://localhost:3000
```

5. Entre com:

```text
Usuario: player
Senha: player123
```

### O Que O Modo Demo Faz

Ele liga tudo para voce:

- banco PostgreSQL;
- RabbitMQ;
- Keycloak;
- Kong;
- Games service;
- Wallets service;
- frontend;
- migracoes do banco.

Ele tambem liga rodadas deterministicas. Isso quer dizer: a rodada demo sempre pode ser conferida do
mesmo jeito. Com a configuracao padrao, o crash deterministico verifica em `4.66x`.

### Como Conferir A Demo

Depois que `npm run demo:up` terminar, rode:

```bash
npm run smoke:api
```

Se quiser testar tambem o login real no navegador com Playwright, rode:

```bash
npm run smoke:browser
```

Se o Playwright disser que falta o Chromium, rode uma vez:

```bash
npx playwright install chromium
```

## Modo Producao Local

Este modo e para jogar localmente de um jeito mais parecido com producao. Ainda roda no seu
computador com Docker Compose, mas as rodadas nao ficam presas no resultado deterministico da demo.

### Como Rodar

1. Abra o Docker Desktop.
2. No terminal, dentro da pasta do projeto, rode:

```bash
npm run docker:up
```

Se voce usa Bun e prefere ele, tambem pode rodar:

```bash
bun run docker:up
```

3. Abra:

```text
http://localhost:3000
```

4. Entre com:

```text
Usuario: player
Senha: player123
```

### Diferenca Entre Demo E Producao Local

- `npm run demo:up`: melhor para avaliacao, porque usa rodada deterministica e facilita conferir o
  resultado.
- `npm run docker:up`: melhor para jogo local normal, porque usa pontos de crash gerados pelo
  servidor.

Nos dois modos, o jogo usa PostgreSQL, RabbitMQ, Keycloak, Kong, migracoes automaticas e backend
autoritativo.

## Links Locais

Depois de subir o projeto, estes links ficam disponiveis:

- Jogo: `http://localhost:3000`
- Swagger Games: `http://localhost:4001/docs`
- Swagger Wallets: `http://localhost:4002/docs`
- Kong: `http://localhost:8000`
- Keycloak: `http://localhost:8080`
- RabbitMQ Management: `http://localhost:15672`

Credenciais principais:

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

## Como Jogar

1. Abra o jogo.
2. Faca login.
3. Escolha o valor da aposta.
4. Clique para apostar enquanto a rodada estiver aberta.
5. Depois que a aposta for aceita, clique em **Pronto para comecar**.
6. Quando a cabra estiver subindo, clique em cashout antes do crash.

Atalhos do teclado:

- `H`: abre ou fecha o modal de comandos.
- `B`: aposta enquanto a rodada esta aberta.
- `C`: faz cashout durante a subida.
- `A`: liga ou desliga o auto-cashout antes da aposta ativa.
- `[` e `]`: diminuem ou aumentam a aposta em R$ 1,00.

## Como Parar

Para desligar os containers sem apagar os dados:

```bash
npm run docker:down
```

Para apagar containers, imagens e volumes locais:

```bash
npm run docker:prune
```

Use `npm run docker:prune` so quando quiser limpar tudo e comecar do zero.

## Se Algo Der Errado

Se aparecer erro dizendo que o Docker nao esta disponivel:

1. Abra o Docker Desktop.
2. Espere ele ficar pronto.
3. Rode o comando de novo.

Se o Keycloak demorar na primeira vez, espere um pouco. Ele costuma ser mais lento no primeiro boot.
Para olhar o estado dos containers:

```bash
docker compose ps
```

Para ver logs do Keycloak:

```bash
docker compose logs --tail 120 keycloak
```

Se alguma porta ja estiver ocupada, feche o programa que esta usando a porta ou mude esse programa de
porta. O projeto usa:

- `3000` frontend
- `4001` Games
- `4002` Wallets
- `5432` PostgreSQL
- `5672` RabbitMQ
- `8000`, `8001`, `8443` Kong
- `8080` Keycloak
- `15672` RabbitMQ Management

## Comandos De Validacao

Caminho principal:

```bash
npm run demo:up
npm run smoke:api
npm run smoke:browser
```

Checagens uteis para desenvolvimento:

```bash
npx tsc -p services/games/tsconfig.json --noEmit
npx tsc -p services/wallets/tsconfig.json --noEmit
npx tsc -p frontend/tsconfig.json --noEmit
npm --workspace frontend run test
npm --workspace frontend run build
npm --workspace @crash/games run test
npm --workspace @crash/games run test:e2e
npm --workspace @crash/wallets run test
npm --workspace @crash/wallets run test:e2e
docker compose config --quiet
```

## Mapa Da Documentacao

- `docs/overview.md`: visao geral do produto.
- `docs/architecture.md`: arquitetura e stack.
- `docs/domain-model.md`: entidades, valores e regras do dominio.
- `docs/architecture-decisions.md`: decisoes arquiteturais.
- `docs/handoff.md`: status atual e notas de validacao.
- `docs/roadmap.md`: fases concluidas e trabalho adiado.
- `docs/next-spec-prompt.md`: proximo prompt opcional de Spec Kit.

## O Que Ainda Ficou Para Depois

O projeto esta pronto para revisao local do desafio, mas nao e uma implantacao hospedada de producao.
Ficaram para depois: outbox/inbox transacional, mais testes Playwright de regressao, observabilidade
mais profunda, efeitos sonoros e hardening para deploy hospedado.
