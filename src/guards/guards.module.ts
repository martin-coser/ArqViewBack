import { DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { PlanesGuard } from './planes.guard';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Inmobiliaria])],
  providers: [JwtAuthGuard, RolesGuard, PlanesGuard],
  exports: [JwtAuthGuard, RolesGuard, PlanesGuard],
})
export class GuardsModule {
  static forRoot(): DynamicModule {
    return {
      module: GuardsModule,
      imports: [TypeOrmModule.forFeature([Inmobiliaria])],
      providers: [
        // ✅ JwtAuthGuard necesita Reflector
        JwtAuthGuard,
        RolesGuard,
        PlanesGuard,
        
        // Registrar como globales
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard, // ← PRIMERO (autenticación)
        },
        {
          provide: APP_GUARD,
          useClass: RolesGuard,   // ← SEGUNDO (roles)
        },
        {
          provide: APP_GUARD,
          useClass: PlanesGuard,  // ← TERCERO (planes)
        },
      ],
      exports: [JwtAuthGuard, RolesGuard, PlanesGuard],
    };
  }
}