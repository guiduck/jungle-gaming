# Arquitetura

## Stack

- Runtime: Bun.
- Backend/API: NestJS + TypeScript strict.
- Persistencia: PostgreSQL 18+ com MikroORM.
- Mensageria: RabbitMQ.
- API Gateway: Kong em modo declarativo sem banco.
- Identidade: Keycloak com OIDC authorization code flow e PKCE.
- WebSocket: NestJS WebSockets com Socket.IO.
- Frontend/UI: Vite + React + Tailwind CSS v4.
- Estado no frontend: TanStack Query para estado de servidor e Zustand para estado quente do jogo.
- Runtime local: Docker Compose para entrega do desafio.
- Documentacao de API: Swagger/OpenAPI via `@nestjs/swagger`.

## Fronteiras de Servico

### Game Service

E dono das rodadas, apostas, geracao do ponto de crash, dados de verificacao provably fair, ciclo de
vida do jogo, acoes REST de gameplay e eventos WebSocket do servidor para o cliente.

O Game Service pode solicitar reserva/debito e liquidacao da carteira por eventos RabbitMQ ou por um
adaptador interno de desenvolvimento, mas nao e dono do saldo do jogador.

### Wallet Service

E dono da criacao de carteiras, saldo, debito, credito, registros de liquidacao, decisao de saldo
insuficiente e invariantes monetarias.

Credito e debito nao sao expostos como operacoes REST publicas. Eles acontecem por fluxos internos
da aplicacao e devem ser idempotentes.

### Frontend

E dono de renderizacao, interacao, fluxo cliente de autenticacao, timing local de animacao e
feedback otimista quando seguro. O frontend nao decide resultado autoritativo da rodada, payout,
saldo de carteira ou ponto de crash.

## Camadas DDD

Cada servico NestJS deve manter as camadas do scaffold com responsabilidades claras:

- `domain/`: entidades, value objects, servicos de dominio, erros e invariantes. Nao importa
  NestJS, HTTP, MikroORM, RabbitMQ, Socket.IO, DTOs ou banco.
- `application/`: casos de uso, portas de repositorio, portas de eventos, fronteiras transacionais
  e orquestracao.
- `infrastructure/`: mapeamentos/repositorios MikroORM, configuracao PostgreSQL, adaptadores
  RabbitMQ, adaptadores de verificacao JWT/Keycloak e integracoes tecnicas.
- `presentation/`: controllers REST, gateways WebSocket, DTOs, guards, anotacoes Swagger e
  mapeamento de request/response.

A camada de aplicacao depende de interfaces de repositorio. A infraestrutura implementa essas
interfaces. Assim, o dominio permanece focado nas regras de jogo e carteira, sem detalhes de
persistencia.

## Estrategia de Estado do Jogo

O servidor e a fonte de verdade. O frontend mantem estado quente local apenas para renderizar a
experiencia de forma fluida.

- TanStack Query: carteira, historico de rodadas, snapshot da rodada atual, historico de apostas do
  jogador e requisicoes de verificacao.
- Zustand: fase atual, multiplicador exibido, countdown, apostas visiveis, status da aposta do
  jogador, status do WebSocket, flags de animacao da cabra/montanha e estado do sistema de
  dialogos/onboarding.
- REST: acoes do jogador, como apostar e sacar.
- REST read models: `GET /games/rounds/history` retorna historico enriquecido de rodadas
  completadas, `GET /games/leaderboard` retorna ranking somente-leitura de cashouts realizados, e
  `GET /games/bets/me` retorna historico da aposta do jogador autenticado com contexto da rodada.
  Esses endpoints leem apenas dados autoritativos persistidos de `Round`/`Bet`; nao disparam
  debito, credito, cashout, liquidacao, eventos RabbitMQ ou eventos WebSocket novos.
- WebSocket: atualizacoes servidor-cliente, como janela de apostas aberta, rodada iniciada, tick de
  multiplicador, aposta aceita, cashout aceito, rodada crashada e liquidacao concluida.
- Auto cashout: configuracao opcional enviada no `POST /games/bet` como
  `autoCashoutMultiplierBps`. O Game Service persiste o alvo junto da aposta, avalia o alvo no
  runner durante `running` antes de publicar o proximo tick visivel e emite `cashout.accepted` com
  `cashoutTrigger=auto` quando o cashout automatico vence antes do crash.

## Notas Operacionais

O scaffold oficial esta importado na raiz do repositorio. O Docker Compose inclui PostgreSQL,
RabbitMQ, Keycloak, Kong, Game Service, Wallet Service e Frontend.

A entrega local esperada e que o stack suba por Docker Compose a partir de arquivos versionados,
incluindo import do realm do Keycloak, roteamento Kong e inicializacao dos servicos.

Estado atual importante: no perfil Docker/local, os providers ativos agora apontam para
repositorios MikroORM/PostgreSQL por padrao. Os adapters em memoria continuam disponiveis somente
por configuracao explicita de desenvolvimento.

## Defaults de Runtime

- `PERSISTENCE_ADAPTER=postgres` usa PostgreSQL/MikroORM para Game e Wallet.
- `WALLET_EFFECT_ADAPTER=rabbitmq` usa RabbitMQ para debito de aposta e credito de payout.
- `AUTH_MODE=keycloak` exige bearer token e deriva `PlayerId` do `sub`.
- `AUTH_MODE=dev` permite `x-player-id` apenas como modo explicito de smoke.

O Docker Compose executa `games-migrations` e `wallets-migrations` antes de iniciar os servicos.
Esses jobs rodam `bun run migration:up` com o config MikroORM de cada servico e sao repetiveis.

## Demo Local e Observabilidade

O comando `npm run demo:up` e um wrapper operacional para avaliadores. Ele usa Docker Compose,
confere migrations, aguarda health checks e imprime URLs/credenciais. Para manter o smoke
deterministico sem mudar as regras publicas, esse wrapper inicia o Games com
`DEMO_DETERMINISTIC_ROUNDS=true`; o caminho normal `bun run docker:up` permanece com
`DEMO_DETERMINISTIC_ROUNDS=false`.

Para jogar localmente como usuario, use o caminho normal `bun run docker:up`, abra
`http://localhost:3000` e autentique pelo Keycloak com `player` / `player123`. Nesse modo a rodada
nao fica presa a seed fixa de smoke: o Game Service usa o caminho regular de seed/nonce derivado do
round, e o frontend apenas projeta estado autoritativo vindo do backend.

O frontend agora apresenta uma tela propria de boas-vindas/login antes de iniciar esse redirect. A
aplicacao nao captura senha do Keycloak diretamente; o botao de login apenas inicia o fluxo OIDC
authorization code com PKCE, mantendo Keycloak como identity provider e reduzindo a exposicao da
tela padrao do provedor para uma etapa tecnica.

O onboarding visual-novel e implementado no frontend com Zustand. Ele guarda flags locais de
boas-vindas/tutorial concluido, controla fila de falas com efeito typewriter, dispara o modal de
comandos ao fim do tutorial e permite mensagens amigaveis por fase sem afetar REST, WebSocket,
Wallet, crash point, payout ou persistencia.

Quando o modo demo deterministico esta ativo, a escolha de seed/nonce da proxima rodada usa valores
locais de demo, mas a regra de crash continua sendo a mesma: compromisso SHA-256, derivacao
HMAC-SHA256, multiplicador em basis points e verificacao posterior pelo endpoint de verify. O modo
nao adiciona endpoint publico para controlar crash point nem para alterar saldo de carteira.

Os servicos emitem logs concisos de ciclo de vida usando o logger do NestJS: modo de startup,
transicoes de rodada, efeitos de Wallet, publish/consume RabbitMQ, rejeicoes de auth e resultados
idempotentes. Esses logs sao sinais operacionais locais; nao ha infraestrutura de monitoramento
pesada nesta fatia.

O frontend tambem emite telemetria leve no console do navegador, usando funcoes puras para formatar
eventos `key=value`. Os sinais cobrem inicio/conclusao/falha de chamadas API, fluxo Keycloak PKCE,
conexao/desconexao WebSocket, eventos recebidos de rodada, refresh de estado, bet submit, cashout
submit e comandos manuais de rodada. Tokens, authorization codes, PKCE verifier e secrets nao sao
registrados.

Nota de hardening: a reconciliacao de restart tem cobertura e2e para garantir que rodadas antigas
`running/crashed` sejam terminalizadas sem descartar participacao visivel e que reste apenas um
round ativo jogavel.

Nota de auto cashout: o alvo automatico e um dado da aposta, nao uma preferencia transiente do
frontend. O payout continua sendo calculado no dominio Game com centavos inteiros e multiplicador em
basis points; o Wallet recebe o mesmo fluxo idempotente de credito de payout usado por cashout
manual.

Nota de leaderboard/historico: a leitura de ranking e historico usa projecoes simples sobre as
rodadas completadas e apostas persistidas. O ranking padrao e por `payout` realizado; a alternativa
`multiplier` usa o multiplicador de cashout. Ambos usam desempates deterministicos e ignoram apostas
pendentes/perdidas, rodadas ativas e seeds ainda nao reveladas. Nenhuma tabela materializada ou
migracao nova foi adicionada nesta fatia.
