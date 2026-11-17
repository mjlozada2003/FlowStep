import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';

export class AnswerItemDto {
  @ApiProperty({ description: 'ID de la pregunta', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  question_id: number;

  @ApiProperty({ description: 'Opción seleccionada por el usuario', example: 'A' })
  @IsString()
  @IsNotEmpty()
  selected_option: string;
}

export class SubmitEvaluationDto {
  @ApiProperty({
    description: 'Arreglo de respuestas seleccionadas para la evaluación (HU-40)',
    type: [AnswerItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers: AnswerItemDto[];
}
