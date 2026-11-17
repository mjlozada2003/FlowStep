import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class AnswerItemDto {
  @ApiProperty({ description: 'ID de la pregunta', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  question_id: number;

  @ApiProperty({ description: 'Opción seleccionada por el usuario', example: 'A', required: false })
  @IsString()
  @IsOptional()
  selected_option?: string;

  @ApiProperty({ description: 'Opción seleccionada (alias de selected_option)', example: 'A', required: false })
  @IsString()
  @IsOptional()
  selected_option_id?: string;

  @ApiProperty({ description: 'Indica si la respuesta fue correcta', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  is_correct?: boolean;

  @ApiProperty({ description: 'Categoría o tema de la pregunta', example: 'Fundamentos', required: false })
  @IsString()
  @IsOptional()
  category?: string;
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
