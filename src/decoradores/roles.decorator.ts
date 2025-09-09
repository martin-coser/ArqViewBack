import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles'; // Cambié 'role' a 'roles' para reflejar que es un arrays
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);