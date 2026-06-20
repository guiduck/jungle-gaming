# Visao Geral

## Produto

`Jungle Crash Game` e um jogo multiplayer em tempo real do genero crash betting, criado para o
desafio full-stack senior da Jungle Gaming.

O jogador entra em uma janela de apostas, faz uma aposta por rodada, acompanha um multiplicador
subindo a partir de `1.00x` e precisa sacar antes do ponto de crash definido pelo servidor. A
interface traduz a curva classica de um jogo crash para uma cena tematica: uma cabra subindo uma
montanha, com o multiplicador e o estado da rodada guiando a animacao.

## Usuarios

- Usuario principal: jogador autenticado que usa a interface para apostar, sacar, consultar saldo e
  verificar rodadas anteriores.
- Usuario secundario: avaliador que revisa arquitetura, testes, setup local, comportamento de jogo
  e historico de commits.
- Admin/operador: fora do escopo da v1, exceto pelos dashboards locais de infraestrutura, como
  RabbitMQ, Kong, Keycloak e PostgreSQL durante o desenvolvimento.

## Fluxo Principal

1. O jogador faz login pelo Keycloak e chega na tela do jogo.
2. Durante a fase de apostas, o jogador faz uma aposta valida para a rodada atual.
3. O servidor inicia a rodada, emite atualizacoes em tempo real do multiplicador e a UI anima a
   cabra subindo a montanha.
4. O jogador pode sacar durante a fase `running`; o pagamento e calculado a partir do valor
   apostado e do multiplicador atual.
5. O servidor revela o ponto de crash, liquida as apostas pelo fluxo da carteira, persiste o
   historico e abre a proxima fase de apostas.

## Foco Atual

A fundacao de gameplay ja possui um MVP local funcional com runtime em memoria, Docker Compose,
WebSocket, saldo de carteira, historico, verificacao provably fair e animacoes da cabra. A proxima
etapa recomendada e endurecer a entrega com persistencia PostgreSQL real, login Keycloak como fluxo
principal e cobertura e2e automatizada dos caminhos criticos de dinheiro e rodada.
