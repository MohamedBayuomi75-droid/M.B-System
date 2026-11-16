import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { AllowPendingPasswordChange, CurrentUser } from '../authz/decorators';
import { MeDto } from './users.dto';
import { toMe } from '../auth/auth.controller';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  @Get()
  @AllowPendingPasswordChange()
  @ApiOperation({ summary: 'المستخدم الحالي وصلاحياته الفعلية', description: 'المصدر اللي الواجهة بتعرض على أساسه (القرار النهائي دايمًا على السيرفر).' })
  @ApiOkResponse({ type: MeDto })
  me(@CurrentUser() u: AuthUser): MeDto {
    return toMe(u);
  }
}
