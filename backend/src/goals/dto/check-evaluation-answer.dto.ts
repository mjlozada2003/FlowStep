import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

// HU-40, HU-41: respuesta a una pregunta para recibir la correccion inmediata.
export class CheckEvaluationAnswerDto {
  @ApiProperty({ description: 'ID de la pregunta', example: 1 })
  @IsInt()
  question_id: number;

  @ApiProperty({ description: 'Letra de la opción elegida', example: 'A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2)
  selected_option: string;
}
