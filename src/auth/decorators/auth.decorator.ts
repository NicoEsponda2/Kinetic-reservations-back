import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRoleGuard } from '../guards/user-role.guard.js';
import { ValidRoles } from '../interfaces/index.js';
import { RoleProtected } from './role-protected.decorator.js';

/**
 * Protege una ruta o controlador mediante autenticación JWT y validación de roles.
 *
 * @param roles Roles autorizados para acceder al recurso.
 * @returns Un decorador compuesto con las guardias de autenticación y autorización.
 */
export function Auth(...roles: ValidRoles[]) {
  return applyDecorators(
    RoleProtected(...roles),
    UseGuards(AuthGuard(), UserRoleGuard),
  );
}
