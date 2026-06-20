import { ApiProperty } from "@nestjs/swagger";

export class CashoutRequestDto {
  @ApiProperty({ example: 15000, minimum: 10000 })
  multiplierBps: number;
}
