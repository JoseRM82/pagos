import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateIngresoDto } from './dto/create-ingreso.dto';
import { UpdateIngresoDto } from './dto/update-ingreso.dto';
import { IngresosService } from './ingresos.service';

@UseGuards(JwtAuthGuard)
@Controller('ingresos')
export class IngresosController {
  constructor(private readonly ingresosService: IngresosService) {}

  @Post()
  createOne(@Body() dto: CreateIngresoDto) {
    return this.ingresosService.createOne(dto);
  }

  @Patch(':id_ingreso')
  update(
    @Param('id_ingreso') idIngreso: string,
    @Body() dto: UpdateIngresoDto,
  ) {
    return this.ingresosService.update(idIngreso, dto);
  }

  @Delete(':id_ingreso')
  remove(@Param('id_ingreso') idIngreso: string) {
    return this.ingresosService.remove(idIngreso);
  }

  @Get('consolidado/mensual')
  consolidadoMensual() {
    return this.ingresosService.consolidadoMensual();
  }

  @Get('consolidado/anual')
  consolidadoAnual() {
    return this.ingresosService.consolidadoAnual();
  }

  @Get('meses/con-datos')
  mesesConDatos() {
    return this.ingresosService.mesesConDatos();
  }

  @Get('por-mes/:yyyyMm')
  porMes(@Param('yyyyMm') yyyyMm: string) {
    return this.ingresosService.porMes(yyyyMm);
  }

  @Get('concepto/:concepto/consolidado')
  consolidadoConcepto(@Param('concepto') concepto: string) {
    return this.ingresosService.consolidadoConcepto(
      decodeURIComponent(concepto),
    );
  }

  @Get('concepto/:concepto/total')
  totalConcepto(@Param('concepto') concepto: string) {
    return this.ingresosService.totalConcepto(decodeURIComponent(concepto));
  }

  @Get('concepto/:concepto')
  ingresosConcepto(
    @Param('concepto') concepto: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.ingresosService.ingresosConcepto(
      decodeURIComponent(concepto),
      Math.max(1, parseInt(page, 10) || 1),
      Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    );
  }
}
