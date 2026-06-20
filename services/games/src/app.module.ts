import { Module } from "@nestjs/common";
import { GameStateService } from "./application/game-state.service";
import { RoundRunnerService } from "./application/round-runner.service";
import {
  GAME_CLOCK,
  GAME_EVENT_PUBLISHER,
  GAME_ID_GENERATOR,
  GAME_WALLET_GATEWAY,
  ROUND_REPOSITORY,
} from "./application/ports/game-ports";
import { WebSocketGameEventPublisher } from "./infrastructure/events/websocket-game-event.publisher";
import { InMemoryGameMessageReceiptRepository } from "./infrastructure/events/in-memory-game-message-receipt.repository";
import { RabbitMqWalletResultConsumer } from "./infrastructure/events/rabbitmq-wallet-result.consumer";
import { InMemoryRoundRepository } from "./infrastructure/persistence/in-memory-round.repository";
import { SystemClock } from "./infrastructure/system/system-clock";
import { TimestampIdGenerator } from "./infrastructure/system/timestamp-id.generator";
import { HttpGameWalletGateway } from "./infrastructure/wallet/http-game-wallet.gateway";
import { GamesController } from "./presentation/controllers/games.controller";
import { GameGateway } from "./presentation/websocket/game.gateway";

@Module({
  controllers: [GamesController],
  providers: [
    GameStateService,
    RoundRunnerService,
    InMemoryRoundRepository,
    GameGateway,
    WebSocketGameEventPublisher,
    InMemoryGameMessageReceiptRepository,
    RabbitMqWalletResultConsumer,
    HttpGameWalletGateway,
    SystemClock,
    TimestampIdGenerator,
    { provide: ROUND_REPOSITORY, useExisting: InMemoryRoundRepository },
    { provide: GAME_EVENT_PUBLISHER, useExisting: WebSocketGameEventPublisher },
    { provide: GAME_WALLET_GATEWAY, useExisting: HttpGameWalletGateway },
    { provide: GAME_CLOCK, useExisting: SystemClock },
    { provide: GAME_ID_GENERATOR, useExisting: TimestampIdGenerator },
  ],
})
export class AppModule {}
