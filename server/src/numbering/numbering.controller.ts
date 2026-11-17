import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePerms } from '../authz/decorators';
import { NumberingService } from './numbering.service';

/** فحص الترقيم (للمدير): مفيش إصدار أرقام من هنا — الأرقام بتتصرف جوه معاملة كل مستند بس */
@ApiTags('v1 numbering')
@ApiBearerAuth()
@RequirePerms({ flag: 'manageUsers' })
@Controller('v1/numbering')
export class NumberingController {
  constructor(private readonly svc: NumberingService) {}
  @Get(':scope/audit')
  @ApiOperation({ summary: 'فحص فجوات ترقيم نطاق (NO_GAPS)' })
  audit(@Param('scope') scope: string) { return this.svc.audit(scope); }
}
