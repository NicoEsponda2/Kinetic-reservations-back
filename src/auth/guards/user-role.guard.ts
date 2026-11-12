import { Reflector } from '@nestjs/core';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserEntity } from '../entities/user.entity.js';
import { META_ROLES } from '../decorators/role-protected.decorator.js';

@Injectable()
export class UserRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Comprueba que el usuario autenticado posea alguno de los roles requeridos.
   *
   * @param context Contexto de ejecución de la solicitud actual.
   * @returns `true` cuando el acceso está permitido; en caso contrario, lanza una excepción.
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const validRoles: string[] = this.reflector.get(
      META_ROLES,
      context.getHandler(),
    );

    if (!validRoles) return true;
    if (validRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as UserEntity;

    if (!user) throw new BadRequestException('User not found');

    for (const role of user.roles) {
      if (validRoles.includes(role)) {
        return true;
      }
    }

    throw new ForbiddenException(
      `User ${user.nombre} need a valid role: [${validRoles}]`,
    );
  }
}
