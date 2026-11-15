import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { HealthDto } from './health.dto';
import { HealthService } from './health.service';

@ApiTags('system')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'فحص صحة السيرفر', description: 'عام (بدون تسجيل دخول) — للـ uptime monitor و Docker healthcheck. ok/degraded = 200، error = 503.' })
  @ApiOkResponse({ type: HealthDto })
  @ApiServiceUnavailableResponse({ type: HealthDto, description: 'الداتابيز مش متاحة' })
  async get(@Res({ passthrough: true }) res: Response): Promise<HealthDto> {
    const h = await this.health.check();
    if (h.status === 'error') res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return h;
  }
}
