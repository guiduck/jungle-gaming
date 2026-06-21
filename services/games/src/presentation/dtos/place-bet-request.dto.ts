import { ApiProperty } from "@nestjs/swagger";

export class PlaceBetRequestDto {
  @ApiProperty({ example: 1000, minimum: 100, maximum: 100000 })
  amountCents: number;

  @ApiProperty({
    example: 15000,
    minimum: 11000,
    maximum: 1000000,
    required: false,
    nullable: true,
  })
  autoCashoutMultiplierBps?: number | null;
}
