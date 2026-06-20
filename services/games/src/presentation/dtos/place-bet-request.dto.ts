import { ApiProperty } from "@nestjs/swagger";

export class PlaceBetRequestDto {
  @ApiProperty({ example: 1000, minimum: 100, maximum: 100000 })
  amountCents: number;
}
