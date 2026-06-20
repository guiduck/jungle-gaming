import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";

interface SocketServer {
  emit(eventName: string, payload: unknown): void;
}

@WebSocketGateway({
  cors: { origin: "*" },
  path: "/socket",
})
export class GameGateway {
  @WebSocketServer()
  private server?: SocketServer;

  publish(eventName: string, payload: Record<string, unknown>): void {
    this.server?.emit(eventName, {
      eventId: `${eventName}-${Date.now()}`,
      serverTime: new Date().toISOString(),
      ...payload,
    });
  }
}
