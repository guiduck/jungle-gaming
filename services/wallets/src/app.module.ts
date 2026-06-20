import { Module } from "@nestjs/common";
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
import { SystemClock } from "./infrastructure/system/system-clock";
import { TimestampIdGenerator } from "./infrastructure/system/timestamp-id.generator";
import { WalletsController } from "./presentation/controllers/wallets.controller";

@Module({
  controllers: [WalletsController],
  providers: [
    WalletStateService,
    InMemoryWalletRepository,
    InMemoryWalletOperationRepository,
    RabbitMqWalletConsumer,
    RabbitMqWalletResultPublisher,
    SystemClock,
    TimestampIdGenerator,
    { provide: WALLET_REPOSITORY, useExisting: InMemoryWalletRepository },
    { provide: WALLET_OPERATION_REPOSITORY, useExisting: InMemoryWalletOperationRepository },
    { provide: WALLET_RESULT_PUBLISHER, useExisting: RabbitMqWalletResultPublisher },
    { provide: WALLET_CLOCK, useExisting: SystemClock },
    { provide: WALLET_ID_GENERATOR, useExisting: TimestampIdGenerator },
  ],
})
export class AppModule {}
