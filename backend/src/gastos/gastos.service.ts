import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGastoDto } from './dto/create-gasto.dto';
import { UpdateGastoDto } from './dto/update-gasto.dto';
import {
  addToConsolidado,
  emptyConsolidado,
  GastoResponse,
  ConsolidadoAnualResponse,
  ConsolidadoMensualResponse,
  getSegment,
  mapGasto,
  monthRange,
  parseFecha,
  todayFecha,
  withTotal,
} from './gastos.mapper';
import { normalizeConcepto } from './normalize-concepto';

@Injectable()
export class GastosService {
  constructor(private readonly prisma: PrismaService) {}

  async createOne(dto: CreateGastoDto): Promise<GastoResponse> {
    const fecha = dto.fecha ?? todayFecha();
    const gasto = await this.prisma.gasto.create({
      data: {
        fecha: parseFecha(fecha),
        tipo: dto.tipo,
        concepto: normalizeConcepto(dto.concepto),
        cantidad: dto.cantidad,
        prestamo: dto.prestamo ?? false,
        pagado: dto.pagado ?? false,
      },
    });
    return mapGasto(gasto);
  }

  async update(idGasto: string, dto: UpdateGastoDto): Promise<GastoResponse> {
    const existing = await this.prisma.gasto.findUnique({
      where: { idGasto },
    });
    if (!existing) {
      throw new NotFoundException('Gasto no encontrado');
    }

    const gasto = await this.prisma.gasto.update({
      where: { idGasto },
      data: {
        ...(dto.fecha !== undefined && { fecha: parseFecha(dto.fecha) }),
        ...(dto.tipo !== undefined && { tipo: dto.tipo }),
        ...(dto.concepto !== undefined && {
          concepto: normalizeConcepto(dto.concepto),
        }),
        ...(dto.cantidad !== undefined && { cantidad: dto.cantidad }),
        ...(dto.prestamo !== undefined && { prestamo: dto.prestamo }),
        ...(dto.pagado !== undefined && { pagado: dto.pagado }),
      },
    });
    return mapGasto(gasto);
  }

  async remove(idGasto: string): Promise<{ ok: true }> {
    const existing = await this.prisma.gasto.findUnique({
      where: { idGasto },
    });
    if (!existing) {
      throw new NotFoundException('Gasto no encontrado');
    }
    await this.prisma.gasto.delete({ where: { idGasto } });
    return { ok: true };
  }

  async consolidadoMensual(): Promise<ConsolidadoMensualResponse[]> {
    const gastos = await this.prisma.gasto.findMany({
      select: {
        fecha: true,
        cantidad: true,
        tipo: true,
        prestamo: true,
        pagado: true,
      },
    });
    const totals = new Map<
      string,
      { fijo: number; variable: number; prestamo: number }
    >();

    for (const g of gastos) {
      const mes = g.fecha.toISOString().slice(0, 7);
      const acc = totals.get(mes) ?? emptyConsolidado();
      const segment = getSegment(g);
      addToConsolidado(acc, segment, Number(g.cantidad));
      totals.set(mes, acc);
    }

    return [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, acc]) => withTotal(mes, 'mes', acc) as ConsolidadoMensualResponse);
  }

  async consolidadoAnual(): Promise<ConsolidadoAnualResponse[]> {
    const gastos = await this.prisma.gasto.findMany({
      select: {
        fecha: true,
        cantidad: true,
        tipo: true,
        prestamo: true,
        pagado: true,
      },
    });
    const totals = new Map<
      string,
      { fijo: number; variable: number; prestamo: number }
    >();

    for (const g of gastos) {
      const anio = g.fecha.toISOString().slice(0, 4);
      const acc = totals.get(anio) ?? emptyConsolidado();
      const segment = getSegment(g);
      addToConsolidado(acc, segment, Number(g.cantidad));
      totals.set(anio, acc);
    }

    return [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([anio, acc]) => withTotal(anio, 'anio', acc) as ConsolidadoAnualResponse);
  }

  async mesesConDatos(): Promise<string[]> {
    const gastos = await this.prisma.gasto.findMany({
      select: { fecha: true },
    });
    const meses = new Set(
      gastos.map((g) => g.fecha.toISOString().slice(0, 7)),
    );
    return [...meses].sort();
  }

  async porMes(yyyyMm: string): Promise<GastoResponse[]> {
    const { start, end } = monthRange(yyyyMm);
    const gastos = await this.prisma.gasto.findMany({
      where: { fecha: { gte: start, lt: end } },
      orderBy: { fecha: 'asc' },
    });
    return gastos.map(mapGasto);
  }

  async consolidadoConcepto(
    concepto: string,
  ): Promise<ConsolidadoMensualResponse[]> {
    const normalized = normalizeConcepto(concepto);
    const gastos = await this.prisma.gasto.findMany({
      where: { concepto: normalized },
      select: {
        fecha: true,
        cantidad: true,
        tipo: true,
        prestamo: true,
        pagado: true,
      },
    });
    const totals = new Map<
      string,
      { fijo: number; variable: number; prestamo: number }
    >();

    for (const g of gastos) {
      const mes = g.fecha.toISOString().slice(0, 7);
      const acc = totals.get(mes) ?? emptyConsolidado();
      const segment = getSegment(g);
      addToConsolidado(acc, segment, Number(g.cantidad));
      totals.set(mes, acc);
    }

    return [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, acc]) => withTotal(mes, 'mes', acc) as ConsolidadoMensualResponse);
  }

  async totalConcepto(concepto: string): Promise<{ total: number }> {
    const normalized = normalizeConcepto(concepto);
    const result = await this.prisma.gasto.aggregate({
      where: { concepto: normalized },
      _sum: { cantidad: true },
    });
    return { total: Number(result._sum.cantidad ?? 0) };
  }

  async gastosConcepto(
    concepto: string,
    page: number,
    limit: number,
  ): Promise<{
    data: GastoResponse[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const normalized = normalizeConcepto(concepto);
    const skip = (page - 1) * limit;
    const [gastos, total] = await Promise.all([
      this.prisma.gasto.findMany({
        where: { concepto: normalized },
        orderBy: { fecha: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.gasto.count({ where: { concepto: normalized } }),
    ]);
    return {
      data: gastos.map(mapGasto),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
