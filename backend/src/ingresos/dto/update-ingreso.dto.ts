import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { normalizeConcepto } from '../../gastos/normalize-concepto';

export class UpdateIngresoDto {
  @IsOptional()
  @IsDateString({}, { message: 'fecha debe ser YYYY-MM-DD' })
  fecha?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeConcepto(value, 'Ingreso') : value,
  )
  concepto?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  cantidad?: number;

  @IsOptional()
  @IsBoolean()
  prestamo?: boolean;

  @IsOptional()
  @IsBoolean()
  pagado?: boolean;
}
