import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { decodeJwt } from "jose";
import type { PlayerRequest } from "./player-request";

@Injectable()
export class KeycloakJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<PlayerRequest>();
    const playerId = this.playerFromBearer(request) ?? this.headerValue(request, "x-player-id");

    if (!playerId) {
      throw new UnauthorizedException("Authenticated player is required");
    }

    request.playerId = playerId;
    return true;
  }

  private playerFromBearer(request: PlayerRequest): string | undefined {
    const authorization = this.headerValue(request, "authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return undefined;
    }

    try {
      const token = authorization.slice("Bearer ".length);
      const claims = decodeJwt(token);
      return typeof claims.sub === "string" ? claims.sub : undefined;
    } catch {
      throw new UnauthorizedException("Invalid bearer token");
    }
  }

  private headerValue(request: PlayerRequest, key: string): string | undefined {
    const value = request.headers[key] ?? request.headers[key.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }
}
