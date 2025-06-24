import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class RolesGuard implements CanActivate {

  // El Reflector nos permite acceder a los metadatos definidos con @SetMetadata (o decoradores personalizados como @Roles)
  constructor(private reflector: Reflector) {}

  // Este método se ejecuta automáticamente antes de entrar a una ruta protegida
  canActivate(context: ExecutionContext): boolean {

    // Obtenemos el rol requerido para la ruta actual (si fue definido con @SetMetadata o @Roles)
    const requiredRole = this.reflector.get<string>('role', context.getHandler());

    // Si no se especificó ningún rol, se permite el acceso (la ruta es pública o no restringida por rol)
    if (!requiredRole) {
      return true;
    }

    // Obtenemos el objeto request de la petición HTTP actual
    const request = context.switchToHttp().getRequest();

    // Extraemos el usuario autenticado del request (esto lo establece previamente JwtStrategy)
    const user = request.user;

    // Validamos que el usuario exista y que su rol coincida con el rol requerido para la ruta
    return user && user.rol === requiredRole;
  }
}
