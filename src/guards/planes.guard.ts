import { CanActivate, ExecutionContext, Injectable, ForbiddenException, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { Inmobiliaria } from "../inmobiliaria/entities/inmobiliaria.entity";
import { Repository } from "typeorm";
import { PLANES_KEY } from "src/guards/decoradores/planes.decorator";

@Injectable()
export class PlanesGuard implements CanActivate {
    private readonly logger = new Logger(PlanesGuard.name);

    constructor(
        private reflector: Reflector,
        @InjectRepository(Inmobiliaria)
        private inmobiliariaRepository: Repository<Inmobiliaria>,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        
        // Obtener los planes requeridos para la ruta actual
        const requiredPlans = this.reflector.get<string[]>(PLANES_KEY, context.getHandler());

        // Si no se especificaron planes, permitir el acceso
        if (!requiredPlans || requiredPlans.length === 0) {
            return true;
        }

        // Obtener el objeto request y el usuario autenticado
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            this.logger.error('No hay usuario autenticado');
            throw new ForbiddenException('Usuario no autenticado');
        }

        // Buscar inmobiliaria asociada al usuario
        const inmobiliaria = await this.inmobiliariaRepository.findOne({
            where: { cuenta: { id: user.id } },
            relations: ['cuenta'], // Para debugging
        });

        // ✅ MANEJAR CASO NULL
        if (!inmobiliaria) {
            this.logger.error(`No se encontró inmobiliaria para usuario ${user.id}`);
            throw new ForbiddenException(
                `No tienes una inmobiliaria asociada. Contacta al administrador.`
            );
        }

        // Verificar que el plan del usuario está en la lista de planes permitidos
        const hasValidPlan = requiredPlans.includes(inmobiliaria.plan);

        if (!hasValidPlan) {
            // 🎯 MENSaje PERSONALIZADO DE MARKETING
            await this.throwPremiumRequiredError(
                user.nombreUsuario, 
                inmobiliaria.plan, 
                requiredPlans,
                request.url
            );
        }

        return true;
    }

    /**
     * 🎯 LANZA EXCEPCIÓN CON MENSAJE DE MARKETING PERSONALIZADO
     */
    private async throwPremiumRequiredError(
        username: string, 
        currentPlan: string, 
        requiredPlans: string[], 
        url: string
    ): Promise<never> {
        this.logger.warn(`Usuario ${username} (${currentPlan}) intentó acceder a ${url} que requiere ${requiredPlans.join(', ')}`);

        // Obtener beneficios dinámicos según el plan requerido
        const benefits = this.getPlanBenefits(requiredPlans[0]);
        
        // Personalizar mensaje según plan actual
        let upgradeMessage = '';
        let ctaButton = '';
        let upgradeUrl = `/suscripcion/upgrade?from=${currentPlan}&to=${requiredPlans[0].toLowerCase()}`;
        
        switch (currentPlan) {
            case 'BASICO':
                upgradeMessage = `✨ ¡Hola ${username}! 🚀 
Tu plan Básico es perfecto para empezar, pero para desbloquear esta funcionalidad premium 
necesitas la suscripción ${requiredPlans[0]}. 

¡Actualiza por solo $29/mes y obtén análisis avanzados que multiplicarán tus ventas! 💰`;
                ctaButton = 'Actualizar a Premium ahora';
                break;
                
            case 'PREMIUM':
                upgradeMessage = `¡${username}! ⚠️ Algo salió mal - tu plan Premium debería permitir acceso a esta función. 
Contacta a soporte para resolverlo inmediatamente.`;
                ctaButton = 'Contactar Soporte';
                upgradeUrl = '/contacto/soporte';
                break;
                
            default:
                upgradeMessage = `🔒 ¡Hola ${username}! Para acceder a esta función ${requiredPlans[0]}, 
actualiza tu suscripción y desbloquea herramientas exclusivas para inmobiliarias.`;
                ctaButton = 'Ver Planes Disponibles';
                upgradeUrl = '/suscripcion/planes';
        }

        // Construir respuesta personalizada
        const customResponse = {
            statusCode: 403,
            error: 'PlanRequired',
            message: upgradeMessage,
            timestamp: new Date().toISOString(),
            path: url,
            user: {
                username,
                currentPlan,
                requiredPlan: requiredPlans[0]
            },
            solution: {
                upgradeUrl,
                cta: ctaButton,
                benefits,
                support: '¿Problemas? Escríbenos a soporte@arqview.com o WhatsApp: +54 9 351 123-4567',
                trial: currentPlan === 'BASICO' ? 'Prueba Premium 7 días GRATIS' : null
            },
            // 🚀 Para frontend: mostrar modal de upgrade
            showUpgradeModal: true,
            upgradeRequired: true,
            planRequired: requiredPlans[0],
            estimatedValue: this.getEstimatedUpgradeValue(requiredPlans[0])
        };

        // Lanzar excepción con respuesta personalizada
        throw new ForbiddenException(customResponse);
    }

    /**
     * Obtiene beneficios del plan según el tipo requerido
     */
    private getPlanBenefits(plan: string): string[] {
        const benefitsMap: { [key: string]: string[] } = {
            'PREMIUM': [
                '📊 Estadísticas avanzadas en tiempo real',
                '🎯 Análisis de audiencia inteligente', 
                '📈 Reportes ejecutivos personalizados',
                '🚀 Visibilidad prioritaria en búsquedas',
                '💰 Comisión reducida del 1%',
                '📱 Acceso a app móvil exclusiva',
                '🔔 Notificaciones push instantáneas',
                '🔒 Almacenamiento ilimitado de archivos 3D'
            ],
            'ENTERPRISE': [
                '👑 Todo lo de Premium +',
                '🏢 Gestión multi-inmobiliaria centralizada',
                '🤝 Account manager dedicado 24/7', 
                '📞 Soporte prioritario con SLA 1h',
                '💼 Integración completa con CRM',
                '📋 Reportes personalizados ejecutivos',
                '🌐 White-label con tu marca',
                '🔄 API acceso completo y documentación'
            ]
        };

        return benefitsMap[plan] || benefitsMap['PREMIUM'];
    }

    /**
     * Estima el valor agregado del upgrade
     */
    private getEstimatedUpgradeValue(plan: string): string {
        const valueMap: { [key: string]: string } = {
            'PREMIUM': 'Aumenta tus conversiones hasta un 35% con análisis predictivo',
            'ENTERPRISE': 'Gestiona equipos y genera reportes ejecutivos para inversionistas'
        };
        
        return valueMap[plan] || 'Desbloquea herramientas premium para maximizar tus ventas';
    }
}