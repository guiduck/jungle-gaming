import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { WalletStateService } from "./application/wallet-state.service";
import {
  WALLET_CLOCK,
  WALLET_ID_GENERATOR,
  WALLET_OPERATION_REPOSITORY,
  WALLET_REPOSITORY,
  WALLET_RESULT_PUBLISHER,
} from "./application/ports/wallet-ports";
import { RabbitMqWalletConsumer } from "./infrastructure/events/rabbitmq-wallet.consumer";
import { RabbitMqWalletResultPublisher } from "./infrastructure/events/rabbitmq-wallet-result.publisher";
import { InMemoryWalletOperationRepository } from "./infrastructure/persistence/in-memory-wallet-operation.repository";
import { InMemoryWalletRepository } from "./infrastructure/persistence/in-memory-wallet.repository";
import { MikroOrmWalletOperationRepository } from "./infrastructure/persistence/mikro-orm/mikro-orm-wallet-operation.repository";
import { MikroOrmWalletRepository } from "./infrastructure/persistence/mikro-orm/mikro-orm-wallet.repository";
import mikroOrmConfig from "./infrastructure/persistence/mikro-orm/mikro-orm.config";
import { SystemClock } from "./infrastructure/system/system-clock";
import { formatLogEvent } from "./infrastructure/system/log-event";
import { TimestampIdGenerator } from "./infrastructure/system/timestamp-id.generator";
import { WalletsController } from "./presentation/controllers/wallets.controller";

@Module({
  imports: [MikroOrmModule.forRoot(mikroOrmConfig)],
  controllers: [WalletsController],
  providers: [
    WalletStateService,
    InMemoryWalletRepository,
    InMemoryWalletOperationRepository,
    MikroOrmWalletRepository,
    MikroOrmWalletOperationRepository,
    RabbitMqWalletConsumer,
    RabbitMqWalletResultPublisher,
    SystemClock,
    TimestampIdGenerator,
    {
      provide: WALLET_REPOSITORY,
      useFactory: (
        memory: InMemoryWalletRepository,
        postgres: MikroOrmWalletRepository,
      ) => {
        const adapter = process.env.PERSISTENCE_ADAPTER ?? "postgres";

        if (adapter === "memory") {
          console.log(formatLogEvent("startup.persistence", {
            persistenceAdapter: adapter,
            authMode: process.env.AUTH_MODE ?? "keycloak",
          }));
          return memory;
        }

        if (adapter !== "postgres") {
          throw new Error(`Unsupported PERSISTENCE_ADAPTER for Wallets: ${adapter}`);
        }

        assertEnv("DATABASE_URL", "POSTGRES_HOST");
        console.log(formatLogEvent("startup.persistence", {
          persistenceAdapter: adapter,
          authMode: process.env.AUTH_MODE ?? "keycloak",
        }));
        return postgres;
      },
      inject: [InMemoryWalletRepository, MikroOrmWalletRepository],
    },
    {
      provide: WALLET_OPERATION_REPOSITORY,
      useFactory: (
        memory: InMemoryWalletOperationRepository,
        postgres: MikroOrmWalletOperationRepository,
      ) => {
        const adapter = process.env.PERSISTENCE_ADAPTER ?? "postgres";

        if (adapter === "memory") {
          return memory;
        }

        if (adapter !== "postgres") {
          throw new Error(`Unsupported PERSISTENCE_ADAPTER for Wallet operations: ${adapter}`);
        }

        assertEnv("DATABASE_URL", "POSTGRES_HOST");
        return postgres;
      },
      inject: [InMemoryWalletOperationRepository, MikroOrmWalletOperationRepository],
    },
    { provide: WALLET_RESULT_PUBLISHER, useExisting: RabbitMqWalletResultPublisher },
    { provide: WALLET_CLOCK, useExisting: SystemClock },
    { provide: WALLET_ID_GENERATOR, useExisting: TimestampIdGenerator },
  ],
})
export class AppModule {}

function assertEnv(...names: string[]): void {
  if (names.some((name) => process.env[name])) {
    return;
  }

  throw new Error(`Missing required environment variable. Set one of: ${names.join(", ")}`);
}
