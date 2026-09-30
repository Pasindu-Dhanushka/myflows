import { Module } from '@nestjs/common';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { AdministrationModule } from './modules/administration/administration.module';

@Module({
  imports: [PrismaModule, AuthModule, WorkflowsModule, AdministrationModule],
})
export class AppModule {}
