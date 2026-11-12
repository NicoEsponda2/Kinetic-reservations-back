import { SetMetadata } from '@nestjs/common';
import { ValidRoles } from '../interfaces/index.js';

export const META_ROLES = 'roles';

/**
 * Registra los roles permitidos como metadatos del recurso protegido.
 *
 * @param args Roles autorizados para acceder al recurso.
 * @returns Un decorador que asigna los metadatos de roles permitidos.
 */
export const RoleProtected = (...args: ValidRoles[]) => {
  return SetMetadata(META_ROLES, args);
};
