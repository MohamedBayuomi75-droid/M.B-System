import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PagePermDto, RoleDto } from './roles.dto';
import { RolesService } from './roles.service';

@ApiTags('auth')
@ApiBearerAuth()
@ApiExtraModels(PagePermDto)
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'قوالب الأدوار وصلاحياتها (للعرض في شاشة المستخدمين)' })
  @ApiOkResponse({ type: RoleDto, isArray: true })
  list(): RoleDto[] {
    return this.roles.list();
  }
}
