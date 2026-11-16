import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { toMe } from '../auth/auth.controller';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../authz/decorators';
import { BootstrapDto, ChangesQueryDto, ChangesResponseDto, SyncRequestDto, SyncResponseDto, WriteAccessDto } from './data.dto';
import { DataService } from './data.service';

/** Compat API للواجهة القديمة (UNIFIED-WEB-PLAN §2.3). كل حاجة بتعدي على نفس الصلاحيات (collection-pages + field-guards + نطاق المشاريع). */
@ApiTags('data (compat)')
@ApiBearerAuth()
@ApiExtraModels(WriteAccessDto)
@Controller()
export class DataController {
  constructor(private readonly data: DataService) {}

  @Get('bootstrap')
  @ApiOperation({ summary: 'كل البيانات اللي المستخدم يقدر يشوفها بنفس شكل DATA', description: 'مفلترة بالصلاحيات ونطاق المشاريع، والحقول المحمية (رواتب/أرصدة) متشالة. meta.revs لازم تتحفظ عند العميل (baseRev).' })
  @ApiOkResponse({ type: BootstrapDto })
  async bootstrap(@CurrentUser() user: AuthUser): Promise<BootstrapDto> {
    return { ...(await this.data.bootstrap(user)), me: toMe(user) };
  }

  @Post('sync')
  @HttpCode(200)
  @ApiOperation({
    summary: 'حفظ تغييرات (على مستوى السجل/الحقل) في transaction واحدة',
    description: 'كل تغيير معاه baseRev + الحقول المتغيّرة بس. حقول مختلفة = دمج. نفس الحقل اتعدّل من حد تاني: مالي/مركّب = conflict صريح (مايتحفظش)، نصي = آخر واحد يكسب (overwrote). أي تغيير ممنوع = 403 ومفيش حاجة بتتحفظ.',
  })
  @ApiOkResponse({ type: SyncResponseDto })
  @ApiBadRequestResponse({ description: 'INVALID_SYNC (collection غير معروفة، id مكرر، ...)' })
  @ApiForbiddenResponse({ description: 'FORBIDDEN / FIELD_FORBIDDEN / OUT_OF_PROJECT_SCOPE (في details)' })
  sync(@CurrentUser() user: AuthUser, @Body() body: SyncRequestDto): Promise<SyncResponseDto> {
    return this.data.sync(user, body);
  }

  @Get('changes')
  @ApiOperation({ summary: 'التغييرات بعد seq (بعد انقطاع الاتصال اللحظي)', description: 'بالحالة الحالية لكل سجل، مفلترة بالصلاحيات.' })
  @ApiOkResponse({ type: ChangesResponseDto })
  changes(@CurrentUser() user: AuthUser, @Query() q: ChangesQueryDto): Promise<ChangesResponseDto> {
    return this.data.changesSince(user, q.since, q.limit ?? 1000);
  }
}
