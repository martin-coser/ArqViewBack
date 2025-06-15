"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    logger.log(`🚀 Servidor corriendo en http://localhost:${port}`);
    try {
        const dataSource = app.get(typeorm_1.DataSource);
        if (dataSource.isInitialized) {
            logger.log('✅ Conexión a la base de datos establecida con éxito.');
        }
        else {
            logger.error('❌ La base de datos NO se ha inicializado. Revise la configuración de TypeOrmModule.');
        }
    }
    catch (error) {
        logger.error(`❌ Error al verificar el estado de la conexión a la base de datos: ${error.message}`);
    }
}
bootstrap();
//# sourceMappingURL=main.js.map