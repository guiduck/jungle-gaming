import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { decodeJwt } from "jose";
import type { PlayerRequest } from "./player-request";
import { formatLogEvent } from "../../infrastructure/system/log-event";

@Injectable()
export class KeycloakJwtGuard implements CanActivate {
  private readonly logger = new Logger(KeycloakJwtGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<PlayerRequest>();
    const authMode = process.env.AUTH_MODE ?? "keycloak";
    const playerId = this.playerFromBearer(request) ??
      (authMode === "dev" ? this.headerValue(request, "x-player-id") : undefined);

    if (!playerId) {
      this.logger.warn(formatLogEvent("auth.rejected", {
        authMode,
        reason: authMode === "dev" ? "missing_player" : "missing_bearer",
      }));
      throw new UnauthorizedException(
        authMode === "dev"
          ? "Authenticated player is required"
          : "Keycloak bearer token is required",
      );
    }

    request.playerId = playerId;
    this.logger.log(formatLogEvent("auth.accepted", { authMode, playerId }));
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
