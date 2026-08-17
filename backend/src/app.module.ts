import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { GastosModule } from './gastos/gastos.module';
import { IngresosModule } from './ingresos/ingresos.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule, GastosModule, IngresosModule],
})
export class AppModule {}