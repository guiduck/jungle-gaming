# Modelo de Dominio

## Contextos Delimitados

### Game

E dono do ciclo de vida do gameplay e das apostas de cada rodada.

### Wallet

E dono do saldo do jogador, das operacoes monetarias e da integridade da liquidacao.

## Entidades e Value Objects

### `Round`

- Aggregate root do contexto Game.
- Campos principais: id, status, timestamps de janela de aposta, timestamp de inicio, ponto de
  crash, hash da seed, dados revelados apos o crash e apostas.
- Ciclo de vida: `betting` -> `running` -> `crashed` -> `settled` -> proxima rodada criada.
- Comportamento principal: aceitar aposta, rejeitar aposta invalida, iniciar, calcular
  multiplicador atual, sacar uma aposta, crashar, revelar dados de verificacao e marcar liquidacao
  completa.

### `Bet`

- Entidade pertencente a `Round`.
- Campos principais: id, id da rodada, id do jogador, valor, status, multiplicador opcional de
  cashout, payout opcional, alvo opcional de auto cashout e origem do cashout (`manual` ou `auto`).
- Ciclo de vida: `pending` -> `cashed_out` ou `lost`; apostas rejeitadas nao entram no aggregate.
- Comportamento principal: validar valor, validar alvo opcional de auto cashout, sacar uma unica
  vez, calcular payout com aritmetica segura para dinheiro e impedir reentrada apos cashout.
- Auto cashout usa `autoCashoutMultiplierBps` opcional entre `11000` (`1.10x`) e `1000000`
  (`100.00x`). Valor ausente ou nulo significa aposta manual-only.

### `CrashPoint`

- Value object que representa o multiplicador predeterminado em que a rodada crasha.
- Gerado antes da rodada comecar pelo algoritmo provably fair.
- Deve ser reproduzivel a partir dos dados de verificacao depois que a rodada termina.

### `Wallet`

- Aggregate root do contexto Wallet.
- Campos principais: id, id do jogador, saldo, versao e historico/ledger de operacoes.
- Comportamento principal: criar carteira, debitar valor reservado para aposta, creditar payout,
  rejeitar saldo insuficiente e impedir saldo negativo.

### `Money`

- Value object que representa moeda usando centavos inteiros.
- Nenhuma aritmetica de dinheiro, saldo ou payout deve usar ponto flutuante.

### `PlayerId`

- Value object extraido do `sub` do JWT autenticado.
- Usado entre servicos como identificador estavel do jogador, sem acoplar o dominio ao formato do
  token do Keycloak.

## Invariantes

- Um jogador pode fazer apenas uma aposta por rodada.
- Apostas so sao aceitas durante a fase `betting`.
- Cashout so e permitido durante a fase `running` e apenas para uma aposta `pending` daquele
  jogador.
- Auto cashout so e aplicado pelo servidor durante a fase `running`, para apostas `pending`, quando
  o alvo foi atingido e o alvo e estritamente menor que o ponto de crash.
- Se o alvo de auto cashout for igual ou maior que o ponto de crash, o crash vence e a aposta
  pendente e marcada como perdida.
- Uma aposta `cashed_out` nao pode ser sacada de novo nem reentrar na mesma rodada.
- O ponto de crash da rodada e predeterminado antes do inicio.
- O saldo da carteira nunca pode ficar negativo.
- Operacoes de carteira sao idempotentes em retentativas RabbitMQ ou chamadas internas repetidas.
- REST publico nao expoe endpoints arbitrarios de credito/debito de carteira.
- Codigo de dominio nao importa NestJS, MikroORM, RabbitMQ, Socket.IO, DTOs ou controllers.

## Decisoes Resolvidas para o MVP

- Provably fair usa compromisso de seed com SHA-256, derivacao de crash com HMAC-SHA256 e
  `houseEdgeBps = 100`.
- Em runtime normal, a seed do servidor e aleatoria e secreta ate a rodada terminar. Antes do crash,
  clientes veem apenas o `serverSeedHash`; depois do crash, o historico/verificacao revela a seed,
  o nonce, a formula e o multiplicador para recomputacao independente.
- O modo demo pode usar seed/nonce fixos para smoke deterministico, mas essa escolha e isolada por
  `DEMO_DETERMINISTIC_ROUNDS=true` e nao muda a formula de verificacao.
- O ponto de crash local fica abaixo de `14.00x`; overflow acima do teto e remapeado de forma
  deterministica dentro do intervalo permitido, sem pinning em `14.00x`.
- RabbitMQ usa eventos explicitos de requisicao/resultado para debito de aposta e credito de
  payout, sempre com chaves de idempotencia.
- A liquidacao usa um fluxo simples de eventos com handlers idempotentes, nao um framework de saga
  generalizado.
- O runtime Docker/local agora usa RabbitMQ por padrao para efeitos de Wallet. O adaptador HTTP
  interno permanece como modo explicito de desenvolvimento/smoke.
- Wallet persiste saldo e ledger em PostgreSQL. `seed_credit`, `debit_bet` e `credit_payout`
  continuam idempotentes por chave; saldo negativo e bloqueado no dominio e por constraint SQL.
- Game persiste rodadas, bets, historico e metadados provably fair. Rehydration normaliza valores
  opcionais nulos do banco antes de recriar entidades de dominio.
- Restart reconciliation preserva bets aceitas; rodadas `running` interrompidas sao crashadas para
  um resultado terminal explicavel e rodadas `crashed` sao liquidadas com payout idempotente.
- Auto cashout foi adicionado como diferencial de Phase 4 sem alterar a regra de dinheiro: o Game
  persiste o alvo na aposta, registra `cashoutTrigger` quando o cashout acontece e continua usando
  `payout-credit:{roundId}:{betId}` para credito idempotente no Wallet.
- Leaderboard e historico enriquecido sao read models derivados de `Round` e `Bet`, nao novos
  aggregates. Eles usam apenas rodadas completadas e dados autoritativos persistidos para calcular
  contagens, totais em centavos, cashouts notaveis, ranking por payout/multiplicador e historico da
  aposta do jogador autenticado.

## Perguntas em Aberto

- A reconciliacao deve ser fortalecida para provar que nao ficam multiplas rodadas ativas jogaveis
  apos restart ou apos dados antigos de smoke.
- Possiveis bonus futuros incluem outbox/inbox transacional, smoke automatizado de PKCE no
  navegador, testes Playwright mais profundos ou observabilidade mais rica se houver requisito
  explicito.
