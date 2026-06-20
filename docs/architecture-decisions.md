# Decisoes de Arquitetura

## ADR-001: Usar MikroORM para Persistencia nos Servicos NestJS

Status: Aceita.

Decisao:

Usar MikroORM nos servicos Game e Wallet.

Contexto:

O desafio avalia DDD, aggregates, invariantes de dominio, camadas limpas, consistencia orientada a
eventos e comportamento seguro para dinheiro. A persistencia deve apoiar esse modelo em vez de
empurrar o codigo para registros puramente tabulares e regras concentradas apenas em application
services.

Racional:

- MikroORM apoia classes de entidade ricas, repositorios, Identity Map e Unit of Work, o que combina
  com persistencia orientada a aggregates.
- Entidades de dominio como `Round`, `Bet` e `Wallet` podem manter comportamento perto do estado,
  enquanto a infraestrutura cuida de mapeamento e armazenamento.
- Application services podem depender de portas de repositorio sem expor detalhes de banco ou ORM ao
  dominio.

Alternativas consideradas:

- Prisma: tem excelente experiencia de desenvolvimento, migrations e geracao de tipos, mas seus
  modelos gerados representam naturalmente registros de banco. Pode ser usado com DDD, porem exige
  mais disciplina de mapeamento para nao vazar tipos Prisma para o dominio.
- TypeORM: familiar no ecossistema NestJS e baseado em decorators, mas menos atrativo aqui porque
  MikroORM tem uma historia mais clara de Unit of Work e encaixa melhor com persistencia orientada a
  aggregates.

Consequencias:

- A camada de dominio nao deve importar `@mikro-orm/*`.
- Entidades/mapeamentos MikroORM e repositorios concretos pertencem a `infrastructure/`.
- Interfaces de repositorio pertencem a `application/` ou a uma pasta de portas voltada ao dominio.
- Testes devem cobrir comportamento de dominio sem exigir banco.

## ADR-002: Usar Zustand para Estado Quente do Jogo

Status: Aceita.

Decisao:

Usar TanStack Query para estado de servidor e Zustand para estado quente do jogo no cliente.

Contexto:

A UI do jogo precisa renderizar countdowns, ticks de multiplicador, listas de aposta e animacao da
cabra com baixa friccao. Ao mesmo tempo, o servidor continua sendo autoritativo para status da
rodada, apostas aceitas, cashout, ponto de crash, saldo e historico.

Racional:

- TanStack Query cuida de snapshots persistidos e refetch: carteira, rodada atual, historicos e
  dados de verificacao.
- Zustand oferece uma store pequena e explicita para projecao em tempo real e estado de animacao.
- React Context funcionaria para estado pequeno, mas Zustand fica mais claro quando eventos
  WebSocket, flags de animacao e estados por fase crescem.

Consequencias:

- O estado Zustand e descartavel e deve ser reconciliavel a partir de snapshots REST e eventos
  WebSocket.
- Eventos do servidor devem carregar informacao suficiente para reconstruir a projecao atual apos
  reconnect.
- Componentes de UI devem ler uma projecao de estado em vez de duplicar logica de fase em varios
  lugares.

## ADR-003: Usar Adapters em Memoria Apenas na Primeira Fatia de Implementacao

Status: Temporaria.

Decisao:

Manter a primeira fatia de implementacao em portas de aplicacao com adapters de infraestrutura em
memoria antes de ligar os adapters runtime de MikroORM e RabbitMQ.

Contexto:

O projeto precisa de uma fatia vertical funcional sem perder as fronteiras DDD. Ir direto para
mapeamentos de banco, migrations, consumidores de mensagem e infraestrutura WebSocket aumentaria a
dificuldade de validar e o risco de overengineering.

Racional:

- Dominio e application services podem ser typechecked e exercitados antes da infraestrutura estar
  completa.
- Portas de repositorio e eventos fazem o trabalho futuro de MikroORM/RabbitMQ ser troca de
  adapters, nao reescrita de regras de dominio.
- Isso segue a regra KISS do projeto: fronteiras uteis agora, sem maquinaria distribuida
  especulativa antes do caminho MVP provar valor.

Consequencias:

- Adapters em memoria nao sao persistencia de producao e devem ser substituidos antes da entrega
  final do desafio.
- O runtime atual e adequado para smoke local, mas a persistencia PostgreSQL real ainda e requisito
  de hardening.
- A documentacao e as tasks devem continuar mostrando persistencia, mensageria, auth, WebSocket e
  e2e como gates ate implementacao e validacao.

## ADR-004: Manter o Round Runner Dentro do Processo no MVP

Status: Aceita para MVP.

Decisao:

Usar um servico NestJS in-process para avancar fases de aposta, corrida, crash, liquidacao e criacao
da proxima rodada durante a entrega local.

Contexto:

O alvo do MVP e um unico stack Docker Compose, nao uma operacao multi-regiao ou multi-instancia. O
runner precisa ser simples de entender e manter o servidor como fonte de verdade.

Consequencias:

- O runner e adequado para uma instancia do Game Service no Docker Compose local.
- Ele deve crashar quando o multiplicador exibido atingir o `crashMultiplierBps` da rodada, nao por
  uma quantidade fixa arbitraria de ticks.
- Eleicao de lider e scheduler distribuido ficam como escopo bonus futuro.

## ADR-005: Usar WebSockets NestJS Compativeis com Socket.IO para Projecao em Tempo Real

Status: Aceita para MVP.

Decisao:

Usar NestJS WebSockets com plataforma compativel com Socket.IO para eventos servidor-cliente. Acoes
do jogador permanecem em REST.

Contexto:

O frontend precisa de push para mudancas de fase, ticks de multiplicador, apostas aceitas, resultado
de cashout, crash, liquidacao e refresh de historico. WebSockets NestJS ja fazem parte da stack
backend escolhida.

Consequencias:

- O frontend usa `socket.io-client` e ainda reconcilia por snapshots REST em connect/reconnect.
- Estado WebSocket e apenas projecao; REST e dominio backend continuam autoritativos.
- `ws` nativo continua sendo uma simplificacao futura possivel se reduzir materialmente a
  complexidade runtime.

## ADR-006: Usar Timeout Retentavel para Confirmacao de Carteira via RabbitMQ

Status: Aceita para MVP.

Decisao:

O Game Service valida elegibilidade da aposta antes dos efeitos de carteira e exige aceitacao da
Wallet antes de tratar a aposta como aceita. Os adapters RabbitMQ de request/response expoem timeout
como estado retentavel de confirmacao de carteira, nao como sucesso.

Contexto:

O desafio exige fronteiras RabbitMQ e idempotencia de carteira, mas o MVP deve evitar um framework
generalizado de saga.

Consequencias:

- Chaves de idempotencia sao obrigatorias para debitos de aposta e creditos de payout.
- Timeout nao deve criar apostas aceitas.
- A UI pode retentar e reconciliar a partir de snapshots/eventos sem duplicar efeitos de carteira.

## ADR-007: Usar Gateway HTTP Interno de Wallet para Smoke Local de Gameplay

Status: Temporaria.

Decisao:

Usar um adapter HTTP interno protegido de Game para Wallet no perfil Docker local para que o smoke
manual debite apostas e credite payouts imediatamente enquanto o caminho e2e RabbitMQ de
request/result ainda e endurecido.

Contexto:

A fundacao de gameplay precisava de um check end-to-end de saldo antes do closeout. As classes de
adapter RabbitMQ existem, mas a cobertura e2e de timeout/retry/idempotencia e a persistencia
PostgreSQL duravel ainda sao trabalho da proxima spec. Um adapter interno local permite que o
aggregate Wallet continue dono das alteracoes de saldo sem expor endpoints REST publicos de
credito/debito arbitrario.

Consequencias:

- REST publico de Wallet permanece limitado a criar/ler carteira.
- Efeitos internos de carteira exigem `x-internal-token`.
- O adapter e aceitavel para smoke local, mas liquidacao em modo RabbitMQ e idempotencia apoiada em
  PostgreSQL precisam ser validadas antes da entrega final com qualidade de producao.

## ADR-008: Adiar a Curva Visual da Montanha para uma Spec de Polish

Status: Proposta.

Decisao:

Implementar a montanha baseada na formula de curva do crash em uma spec posterior de polish de
gameplay, depois da persistencia PostgreSQL, auth real e e2e critico.

Contexto:

A versao final desejada deve desenhar a montanha a partir da curva do multiplicador, fazer a trilha
surgir da direita para a esquerda e inclinar a cabra conforme a derivada/tangente da curva. Isso e
um diferencial visual forte, mas depende de um estado de rodada confiavel, de ticks consistentes e
de validacao de cashout/saldo antes de ser priorizado.

Consequencias:

- A UI atual pode continuar usando sprites de idle/corrida/pulo e uma montanha CSS simples.
- A proxima etapa recomendada continua sendo persistencia, auth e e2e.
- A spec de polish deve definir a formula visual, o mapeamento multiplicador->coordenadas e a
  rotacao da cabra pela inclinacao da curva.
