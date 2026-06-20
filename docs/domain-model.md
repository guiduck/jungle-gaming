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
  cashout e payout opcional.
- Ciclo de vida: `pending` -> `cashed_out` ou `lost`; apostas rejeitadas nao entram no aggregate.
- Comportamento principal: validar valor, sacar uma unica vez, calcular payout com aritmetica
  segura para dinheiro e impedir reentrada apos cashout.

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
- Uma aposta `cashed_out` nao pode ser sacada de novo nem reentrar na mesma rodada.
- O ponto de crash da rodada e predeterminado antes do inicio.
- O saldo da carteira nunca pode ficar negativo.
- Operacoes de carteira sao idempotentes em retentativas RabbitMQ ou chamadas internas repetidas.
- REST publico nao expoe endpoints arbitrarios de credito/debito de carteira.
- Codigo de dominio nao importa NestJS, MikroORM, RabbitMQ, Socket.IO, DTOs ou controllers.

## Decisoes Resolvidas para o MVP

- Provably fair usa compromisso de seed com SHA-256, derivacao de crash com HMAC-SHA256 e
  `houseEdgeBps = 100`.
- RabbitMQ usa eventos explicitos de requisicao/resultado para debito de aposta e credito de
  payout, sempre com chaves de idempotencia.
- A liquidacao usa um fluxo simples de eventos com handlers idempotentes, nao um framework de saga
  generalizado.
- O runtime local atual usa um adaptador HTTP interno de Game para Wallet para permitir smoke de
  saldo antes do hardening completo do caminho RabbitMQ.

## Perguntas em Aberto

- Auto cashout deve entrar apenas depois que os criterios eliminatorios estiverem completos.
- A curva visual final da montanha deve ser especificada em uma proxima etapa de polish, usando a
  formula do multiplicador para desenhar a trilha e inclinar a cabra de acordo com a derivada da
  curva.
