import { ApiProperty } from '@nestjs/swagger';
import { PAGE_ACTIONS, ROLE_KEYS } from './roles';

export class PagePermDto {
  @ApiProperty() view: boolean;
  @ApiProperty() add: boolean;
  @ApiProperty() edit: boolean;
  @ApiProperty() delete: boolean;
}

export class PermissionsDto {
  @ApiProperty() editData: boolean;
  @ApiProperty() deleteData: boolean;
  @ApiProperty() manageUsers: boolean;
  @ApiProperty({ type: 'object', additionalProperties: { $ref: '#/components/schemas/PagePermDto' }, description: `مفتاح الصفحة → ${PAGE_ACTIONS.join('/')}` })
  pages: Record<string, PagePermDto>;
}

export class RoleDto {
  @ApiProperty({ enum: ROLE_KEYS }) key: string;
  @ApiProperty({ example: 'موارد بشرية' }) label: string;
  @ApiProperty({ type: PermissionsDto }) permissions: PermissionsDto;
}
