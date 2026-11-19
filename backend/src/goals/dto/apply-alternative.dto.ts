import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ApplyAlternativeDto {
  @ApiProperty({
    description: 'Tipo de propuesta alternativa de replanificación a aplicar (HU-31, HU-51, HU-52)',
    example: 'balanced',
    enum: ['balanced', 'learning', 'time'],
  })
  @IsNotEmpty({ message: 'El tipo de propuesta es obligatorio' })
  @IsString()
  @IsIn(['balanced', 'learning', 'time'], {
    message: 'El tipo de propuesta debe ser balanced, learning o time',
  })
  proposal_type: 'balanced' | 'learning' | 'time';
}
