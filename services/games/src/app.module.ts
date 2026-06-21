import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { GameStateService } from "./application/game-state.service";
import { RoundRunnerService } from "./application/round-runner.service";
import {
  GAME_CLOCK,
  GAME_EVENT_PUBLISHER,
  GAME_ID_GENERATOR,
  GAME_MESSAGE_RECEIPT_REPOSITORY,
  GAME_WALLET_GATEWAY,
  ROUND_REPOSITORY,
} from "./application/ports/game-ports";
import { WebSocketGameEventPublisher } from "./infrastructure/events/websocket-game-event.publisher";
import { InMemoryGameMessageReceiptRepository } from "./infrastructure/events/in-memory-game-message-receipt.repository";
import { RabbitMqWalletResultConsumer } from "./infrastructure/events/rabbitmq-wallet-result.consumer";
import { RabbitMqGameWalletGateway } from "./infrastructure/events/rabbitmq-game-wallet.gateway";
import { InMemoryRoundRepository } from "./infrastructure/persistence/in-memory-round.repository";
import { MikroOrmGameMessageReceiptRepository } from "./infrastructure/persistence/mikro-orm/mikro-orm-game-message-receipt.repository";
import { MikroOrmRoundRepository } from "./infrastructure/persistence/mikro-orm/mikro-orm-round.repository";
import mikroOrmConfig from "./infrastructure/persistence/mikro-orm/mikro-orm.config";
import { SystemClock } from "./infrastructure/system/system-clock";
import { formatLogEvent } from "./infrastructure/system/log-event";
import { TimestampIdGenerator } from "./infrastructure/system/timestamp-id.generator";
import { HttpGameWalletGateway } from "./infrastructure/wallet/http-game-wallet.gateway";
import { ImmediateGameWalletGateway } from "./infrastructure/wallet/immediate-game-wallet.gateway";
import { GamesController } from "./presentation/controllers/games.controller";
import { GameGateway } from "./presentation/websocket/game.gateway";

@Module({
  imports: [MikroOrmModule.forRoot(mikroOrmConfig)],
  controllers: [GamesController],
  providers: [
    GameStateService,
    RoundRunnerService,
    InMemoryRoundRepository,
    MikroOrmRoundRepository,
    MikroOrmGameMessageReceiptRepository,
    GameGateway,
    WebSocketGameEventPublisher,
    InMemoryGameMessageReceiptRepository,
    RabbitMqWalletResultConsumer,
    RabbitMqGameWalletGateway,
    HttpGameWalletGateway,
    ImmediateGameWalletGateway,
    SystemClock,
    TimestampIdGenerator,
    {
      provide: ROUND_REPOSITORY,
      useFactory: (
        memory: InMemoryRoundRepository,
        postgres: MikroOrmRoundRepository,
      ) => {
        const adapter = process.env.PERSISTENCE_ADAPTER ?? "postgres";

        if (adapter === "memory") {
          console.log(formatLogEvent("startup.persistence", { persistenceAdapter: adapter }));
          return memory;
        }

        if (adapter !== "postgres") {
          throw new Error(`Unsupported PERSISTENCE_ADAPTER for Games: ${adapter}`);
        }

        assertEnv("DATABASE_URL", "POSTGRES_HOST");
        console.log(formatLogEvent("startup.persistence", { persistenceAdapter: adapter }));
        return postgres;
      },
      inject: [InMemoryRoundRepository, MikroOrmRoundRepository],
    },
    {
      provide: GAME_MESSAGE_RECEIPT_REPOSITORY,
      useFactory: (
        memory: InMemoryGameMessageReceiptRepository,
        postgres: MikroOrmGameMessageReceiptRepository,
      ) => {
        const adapter = process.env.PERSISTENCE_ADAPTER ?? "postgres";

        if (adapter === "memory") {
          return memory;
        }

        if (adapter !== "postgres") {
          throw new Error(`Unsupported PERSISTENCE_ADAPTER for Game receipts: ${adapter}`);
        }

        assertEnv("DATABASE_URL", "POSTGRES_HOST");
        return postgres;
      },
      inject: [InMemoryGameMessageReceiptRepository, MikroOrmGameMessageReceiptRepository],
    },
    { provide: GAME_EVENT_PUBLISHER, useExisting: WebSocketGameEventPublisher },
    {
      provide: GAME_WALLET_GATEWAY,
      useFactory: (
        rabbitmq: RabbitMqGameWalletGateway,
        internalHttp: HttpGameWalletGateway,
        immediate: ImmediateGameWalletGateway,
      ) => {
        const adapter = process.env.WALLET_EFFECT_ADAPTER ?? "rabbitmq";

        if (adapter === "rabbitmq") {
          assertEnv("RABBITMQ_URL");
          console.log(formatLogEvent("startup.wallet_effect", {
            walletEffectAdapter: adapter,
            authMode: process.env.AUTH_MODE ?? "keycloak",
          }));
          return rabbitmq;
        }

        if (adapter === "internal-http") {
          console.log(formatLogEvent("startup.wallet_effect", { walletEffectAdapter: adapter }));
          return internalHttp;
        }

        if (adapter === "immediate") {
          console.log(formatLogEvent("startup.wallet_effect", { walletEffectAdapter: adapter }));
          return immediate;
        }

        throw new Error(`Unsupported WALLET_EFFECT_ADAPTER for Games: ${adapter}`);
      },
      inject: [RabbitMqGameWalletGateway, HttpGameWalletGateway, ImmediateGameWalletGateway],
    },
    { provide: GAME_CLOCK, useExisting: SystemClock },
    { provide: GAME_ID_GENERATOR, useExisting: TimestampIdGenerator },
  ],
})
export class AppModule {}

function assertEnv(...names: string[]): void {
  if (names.some((name) => process.env[name])) {
    return;
  }

  throw new Error(`Missing required environment variable. Set one of: ${names.join(", ")}`);
}
