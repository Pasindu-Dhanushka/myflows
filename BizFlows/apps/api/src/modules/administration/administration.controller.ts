import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdministrationService } from './administration.service';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';

@Controller('administration')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
export class AdministrationController {
  constructor(private readonly administrationService: AdministrationService) {}

  @Get('roles')
  getRoles() {
    return this.administrationService.getAvailableRoles();
  }

  @Get('users')
  getUsers() {
    return this.administrationService.getUsers();
  }

  @Patch('users/:id/roles')
  updateRoles(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserRolesDto,
  ) {
    return this.administrationService.updateUserRoles(
      request.auth.user.id,
      userId,
      dto.roles,
    );
  }

  @Get('audit-log')
  getAuditLog() {
    return this.administrationService.getAuditLog();
  }
}
