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
import { CreateGastoDto } from './dto/create-gasto.dto';
import { UpdateGastoDto } from './dto/update-gasto.dto';
import { GastosService } from './gastos.service';

@UseGuards(JwtAuthGuard)
@Controller('gastos')
export class GastosController {
  constructor(private readonly gastosService: GastosService) {}

  @Post()
  createOne(@Body() dto: CreateGastoDto) {
    return this.gastosService.createOne(dto);
  }

  @Patch(':id_gasto')
  update(
    @Param('id_gasto') idGasto: string,
    @Body() dto: UpdateGastoDto,
  ) {
    return this.gastosService.update(idGasto, dto);
  }

  @Delete(':id_gasto')
  remove(@Param('id_gasto') idGasto: string) {
    return this.gastosService.remove(idGasto);
  }

  @Get('consolidado/mensual')
  consolidadoMensual() {
    return this.gastosService.consolidadoMensual();
  }

  @Get('consolidado/anual')
  consolidadoAnual() {
    return this.gastosService.consolidadoAnual();
  }

  @Get('meses/con-datos')
  mesesConDatos() {
    return this.gastosService.mesesConDatos();
  }

  @Get('por-mes/:yyyyMm')
  porMes(@Param('yyyyMm') yyyyMm: string) {
    return this.gastosService.porMes(yyyyMm);
  }

  @Get('concepto/:concepto/consolidado')
  consolidadoConcepto(@Param('concepto') concepto: string) {
    return this.gastosService.consolidadoConcepto(decodeURIComponent(concepto));
  }

  @Get('concepto/:concepto/total')
  totalConcepto(@Param('concepto') concepto: string) {
    return this.gastosService.totalConcepto(decodeURIComponent(concepto));
  }

  @Get('concepto/:concepto')
  gastosConcepto(
    @Param('concepto') concepto: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.gastosService.gastosConcepto(
      decodeURIComponent(concepto),
      Math.max(1, parseInt(page, 10) || 1),
      Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    );
  }
}
