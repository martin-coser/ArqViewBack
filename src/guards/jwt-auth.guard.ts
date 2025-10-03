// src/common/guards/jwt-auth.guard.ts
import { Injectable, Logger, UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ROLES_KEY } from './decoradores/roles.decorator';
import { PLANES_KEY } from './decoradores/planes.decorator';


@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const url = request.url;
    
    // 1️⃣ Rutas de AUTH SIEMPRE públicas (incluso con @Roles())
    const authRoutes = ['/auth/login', '/auth/register', '/auth/validate/'];
    if (authRoutes.some(route => url.startsWith(route))) {
      return true;
    }
    
    // 2️⃣ VERIFICAR DECORADORES - ¡ESTA ES LA MAGIA!
    const handler = context.getHandler();
    const controller = context.getClass();
    
    // Obtener todos los decoradores de autorización
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [handler, controller]);
    const requiredPlans = this.reflector.getAllAndOverride<string[]>(PLANES_KEY, [handler, controller]);
    
    // ✅ SI NO TIENE @Roles() NI @Planes() → PÚBLICA POR DEFECTO
    const hasAuthorizationDecorators = !!(requiredRoles?.length || requiredPlans?.length);
    
    if (!hasAuthorizationDecorators) {
      return true;
    }
    
    const result = (await super.canActivate(context)) as boolean;
    return result;
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const url = request.url;
    
    if (err || !user) {
      throw err || new UnauthorizedException('Token inválido o faltante');
    }
    return user;
  }
}