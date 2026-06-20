import { Injectable } from "@nestjs/common";
import type { GameEventPublisher } from "../../application/ports/game-ports";

@Injectable()
export class NoopGameEventPublisher implements GameEventPublisher {
  publish(): void {
    // RabbitMQ/WebSocket adapters will replace this in the next implementation slice.
  }
}
