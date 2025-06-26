import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/decoradores/roles.decorator';


@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener los roles requeridos para la ruta actual
    const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());

    // Si no se especificaron roles, permitir el acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Obtener el objeto request y el usuario autenticado
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Verificar que el usuario existe y que su rol está en la lista de roles permitidos
    return user && user.rol && requiredRoles.includes(user.rol);
  }
}