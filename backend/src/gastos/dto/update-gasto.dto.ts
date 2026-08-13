import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { normalizeConcepto } from '../normalize-concepto';

export class UpdateGastoDto {
  @IsOptional()
  @IsDateString({}, { message: 'fecha debe ser YYYY-MM-DD' })
  fecha?: string;

  @IsOptional()
  @IsIn(['fijo', 'variable'])
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  tipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeConcepto(value) : value,
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
