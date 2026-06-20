import { Injectable } from "@nestjs/common";
import type { Clock } from "../../application/ports/game-ports";

@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
