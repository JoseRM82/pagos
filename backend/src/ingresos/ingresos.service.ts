import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIngresoDto } from './dto/create-ingreso.dto';
import { UpdateIngresoDto } from './dto/update-ingreso.dto';
import {
  addToIngresoConsolidado,
  emptyIngresoConsolidado,
  IngresoResponse,
  ConsolidadoIngresoAnualResponse,
  ConsolidadoIngresoMensualResponse,
  getIngresoSegment,
  mapIngreso,
  monthRange,
  parseFecha,
  todayFecha,
  withIngresoTotal,
} from './ingresos.mapper';
import { normalizeConcepto } from '../gastos/normalize-concepto';

@Injectable()
export class IngresosService {
  constructor(private readonly prisma: PrismaService) {}

  async createOne(dto: CreateIngresoDto): Promise<IngresoResponse> {
    const fecha = dto.fecha ?? todayFecha();
    const ingreso = await this.prisma.ingreso.create({
      data: {
        fecha: parseFecha(fecha),
        concepto: normalizeConcepto(dto.concepto, 'Ingreso'),
        cantidad: dto.cantidad,
        prestamo: dto.prestamo ?? false,
        pagado: dto.pagado ?? false,
      },
    });
    return mapIngreso(ingreso);
  }

  async update(
    idIngreso: string,
    dto: UpdateIngresoDto,
  ): Promise<IngresoResponse> {
    const existing = await this.prisma.ingreso.findUnique({
      where: { idIngreso },
    });
    if (!existing) {
      throw new NotFoundException('Ingreso no encontrado');
    }

    const ingreso = await this.prisma.ingreso.update({
      where: { idIngreso },
      data: {
        ...(dto.fecha !== undefined && { fecha: parseFecha(dto.fecha) }),
        ...(dto.concepto !== undefined && {
          concepto: normalizeConcepto(dto.concepto, 'Ingreso'),
        }),
        ...(dto.cantidad !== undefined && { cantidad: dto.cantidad }),
        ...(dto.prestamo !== undefined && { prestamo: dto.prestamo }),
        ...(dto.pagado !== undefined && { pagado: dto.pagado }),
      },
    });
    return mapIngreso(ingreso);
  }

  async remove(idIngreso: string): Promise<{ ok: true }> {
    const existing = await this.prisma.ingreso.findUnique({
      where: { idIngreso },
    });
    if (!existing) {
      throw new NotFoundException('Ingreso no encontrado');
    }
    await this.prisma.ingreso.delete({ where: { idIngreso } });
    return { ok: true };
  }

  async consolidadoMensual(): Promise<ConsolidadoIngresoMensualResponse[]> {
    const ingresos = await this.prisma.ingreso.findMany({
      select: {
        fecha: true,
        cantidad: true,
        prestamo: true,
      },
    });
    const totals = new Map<
      string,
      { no_prestamo: number; prestamo: number }
    >();

    for (const row of ingresos) {
      const mes = row.fecha.toISOString().slice(0, 7);
      const acc = totals.get(mes) ?? emptyIngresoConsolidado();
      const segment = getIngresoSegment(row);
      addToIngresoConsolidado(acc, segment, Number(row.cantidad));
      totals.set(mes, acc);
    }

    return [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([mes, acc]) =>
          withIngresoTotal(mes, 'mes', acc) as ConsolidadoIngresoMensualResponse,
      );
  }

  async consolidadoAnual(): Promise<ConsolidadoIngresoAnualResponse[]> {
    const ingresos = await this.prisma.ingreso.findMany({
      select: {
        fecha: true,
        cantidad: true,
        prestamo: true,
      },
    });
    const totals = new Map<
      string,
      { no_prestamo: number; prestamo: number }
    >();

    for (const row of ingresos) {
      const anio = row.fecha.toISOString().slice(0, 4);
      const acc = totals.get(anio) ?? emptyIngresoConsolidado();
      const segment = getIngresoSegment(row);
      addToIngresoConsolidado(acc, segment, Number(row.cantidad));
      totals.set(anio, acc);
    }

    return [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([anio, acc]) =>
          withIngresoTotal(
            anio,
            'anio',
            acc,
          ) as ConsolidadoIngresoAnualResponse,
      );
  }

  async mesesConDatos(): Promise<string[]> {
    const ingresos = await this.prisma.ingreso.findMany({
      select: { fecha: true },
    });
    const meses = new Set(
      ingresos.map((g) => g.fecha.toISOString().slice(0, 7)),
    );
    return [...meses].sort();
  }

  async porMes(yyyyMm: string): Promise<IngresoResponse[]> {
    const { start, end } = monthRange(yyyyMm);
    const ingresos = await this.prisma.ingreso.findMany({
      where: { fecha: { gte: start, lt: end } },
      orderBy: { fecha: 'asc' },
    });
    return ingresos.map(mapIngreso);
  }

  async consolidadoConcepto(
    concepto: string,
  ): Promise<ConsolidadoIngresoMensualResponse[]> {
    const normalized = normalizeConcepto(concepto, 'Ingreso');
    const ingresos = await this.prisma.ingreso.findMany({
      where: { concepto: normalized },
      select: {
        fecha: true,
        cantidad: true,
        prestamo: true,
      },
    });
    const totals = new Map<
      string,
      { no_prestamo: number; prestamo: number }
    >();

    for (const row of ingresos) {
      const mes = row.fecha.toISOString().slice(0, 7);
      const acc = totals.get(mes) ?? emptyIngresoConsolidado();
      const segment = getIngresoSegment(row);
      addToIngresoConsolidado(acc, segment, Number(row.cantidad));
      totals.set(mes, acc);
    }

    return [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([mes, acc]) =>
          withIngresoTotal(mes, 'mes', acc) as ConsolidadoIngresoMensualResponse,
      );
  }

  async totalConcepto(concepto: string): Promise<{ total: number }> {
    const normalized = normalizeConcepto(concepto, 'Ingreso');
    const result = await this.prisma.ingreso.aggregate({
      where: { concepto: normalized },
      _sum: { cantidad: true },
    });
    return { total: Number(result._sum.cantidad ?? 0) };
  }

  async ingresosConcepto(
    concepto: string,
    page: number,
    limit: number,
  ): Promise<{
    data: IngresoResponse[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const normalized = normalizeConcepto(concepto, 'Ingreso');
    const skip = (page - 1) * limit;
    const [ingresos, total] = await Promise.all([
      this.prisma.ingreso.findMany({
        where: { concepto: normalized },
        orderBy: { fecha: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.ingreso.count({ where: { concepto: normalized } }),
    ]);
    return {
      data: ingresos.map(mapIngreso),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
