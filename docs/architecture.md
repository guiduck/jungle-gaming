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
  jogador, status do WebSocket e flags de animacao da cabra/montanha.
- REST: acoes do jogador, como apostar e sacar.
- WebSocket: atualizacoes servidor-cliente, como janela de apostas aberta, rodada iniciada, tick de
  multiplicador, aposta aceita, cashout aceito, rodada crashada e liquidacao concluida.

## Notas Operacionais

O scaffold oficial esta importado na raiz do repositorio. O Docker Compose inclui PostgreSQL,
RabbitMQ, Keycloak, Kong, Game Service, Wallet Service e Frontend.

A entrega local esperada e que o stack suba por Docker Compose a partir de arquivos versionados,
incluindo import do realm do Keycloak, roteamento Kong e inicializacao dos servicos.

Estado atual importante: o PostgreSQL sobe e os artefatos MikroORM existem, mas os providers ativos
de Game e Wallet ainda usam repositorios em memoria. A persistencia PostgreSQL real e a proxima
etapa de hardening.
