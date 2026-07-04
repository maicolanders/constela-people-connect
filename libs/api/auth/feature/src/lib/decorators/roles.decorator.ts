import { SetMetadata } from '@nestjs/common';
import { RolCodigo } from '@censo/shared-data-access';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: RolCodigo[]) => SetMetadata(ROLES_KEY, roles);
