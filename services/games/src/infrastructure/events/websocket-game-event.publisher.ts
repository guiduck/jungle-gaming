import { Injectable } from "@nestjs/common";
import type { GameEventPublisher } from "../../application/ports/game-ports";
import { GameGateway } from "../../presentation/websocket/game.gateway";

@Injectable()
export class WebSocketGameEventPublisher implements GameEventPublisher {
  constructor(private readonly gateway: GameGateway) {}

  publish(eventName: string, payload: Record<string, unknown>): void {
    this.gateway.publish(eventName, payload);
  }
}
