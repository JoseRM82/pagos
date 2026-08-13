import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { GastosModule } from './gastos/gastos.module';

@Module({
  imports: [PrismaModule, GastosModule],
})
export class AppModule {}
