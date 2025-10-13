import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Res, UseGuards, HttpStatus, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterCuentaDto } from './dto/register-cuenta.dto';
import { LoginCuentaDto } from './dto/login-cuenta.dto';
import { Roles } from 'src/guards/decoradores/roles.decorator';
import { Cuenta } from './entities/cuenta.entity';
import { Response } from 'express';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerCuentaDto: RegisterCuentaDto) : Promise<Cuenta> {
    return this.authService.register(registerCuentaDto);
  }

  @Post('login')
  async login(@Body() loginCuentaDto: LoginCuentaDto) {
    const user = await this.authService.validate(loginCuentaDto);
    return this.authService.login(user);
  }

  @Get('findAll')
  @Roles('ADMIN')
  async findAll(): Promise<RegisterCuentaDto[]> {
    return await this.authService.findAll()
  }

  @Post('verificarPass/:id')
  @Roles('CLIENTE', 'INMOBILIARIA') 
  async verificarPass(@Param('id', ParseIntPipe) id: number, @Body() body: { oldPassword: string }) {
    return await this.authService.verificarPass(id, body);
  }

  @Patch('/updatePass/:id')
  @Roles('CLIENTE', 'INMOBILIARIA')
  async updatePass(@Param('id', ParseIntPipe) id: number, @Body() body: { newPassword: string }) {
    return await this.authService.updatePass(id, body);
  }

@Get('validate/:token')
async validateAccount(@Param('token') token: string, @Res() res: Response) {
  try {
    const result = await this.authService.validateAccount(token);

    // HTML de éxito
    const successHtml = `
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Cuenta Validada</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }

            .container {
              background-color: #ffffff;
              padding: 48px 40px;
              border-radius: 20px;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
              max-width: 480px;
              width: 100%;
              text-align: center;
              animation: slideUp 0.5s ease-out;
            }

            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            .icon-wrapper {
              width: 80px;
              height: 80px;
              background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 24px;
              box-shadow: 0 8px 20px rgba(20, 184, 166, 0.3);
            }

            .icon-wrapper::before {
              content: '✓';
              font-size: 48px;
              color: #ffffff;
              font-weight: bold;
            }

            h1 {
              color: #0f172a;
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 16px;
              line-height: 1.3;
            }

            .message {
              color: #475569;
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 12px;
            }

            .secondary-message {
              color: #64748b;
              font-size: 14px;
              line-height: 1.5;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              margin-top: 20px;
            }

            .accent-bar {
              width: 60px;
              height: 4px;
              background: linear-gradient(90deg, #14b8a6 0%, #0d9488 100%);
              margin: 24px auto;
              border-radius: 2px;
            }

            @media (max-width: 480px) {
              .container {
                padding: 36px 24px;
              }

              h1 {
                font-size: 24px;
              }

              .icon-wrapper {
                width: 70px;
                height: 70px;
              }

              .icon-wrapper::before {
                font-size: 40px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon-wrapper"></div>
            <h1>¡Cuenta Validada!</h1>
            <div class="accent-bar"></div>
            <p class="message">${result}</p>
            <p class="secondary-message">Ya puedes cerrar esta ventana e iniciar sesión en la aplicación.</p>
          </div>
        </body>
      </html>
    `;
    res.status(HttpStatus.OK).send(successHtml);

  } catch (error) {
      // HTML de error
      const errorMessage = error instanceof NotFoundException
        ? error.message
        : 'Error interno del servidor. Inténtalo de nuevo más tarde.';

      const errorHtml = `
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error en la Validación</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }

            .container {
              background-color: #ffffff;
              padding: 48px 40px;
              border-radius: 20px;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
              max-width: 480px;
              width: 100%;
              text-align: center;
              animation: slideIn 0.5s ease-out;
            }

            @keyframes slideIn {
              from {
                opacity: 0;
                transform: translateY(-20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            .icon-container {
              width: 80px;
              height: 80px;
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 24px;
              box-shadow: 0 8px 20px rgba(239, 68, 68, 0.3);
            }

            .icon-container svg {
              width: 40px;
              height: 40px;
              stroke: white;
              stroke-width: 3;
              stroke-linecap: round;
            }

            h1 {
              color: #1f2937;
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 16px;
              line-height: 1.3;
            }

            .error-message {
              color: #ef4444;
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 24px;
              font-weight: 500;
            }

            .info-text {
              color: #6b7280;
              font-size: 15px;
              line-height: 1.6;
              margin-bottom: 0;
            }

            .divider {
              height: 4px;
              background: linear-gradient(90deg, transparent, #ef4444, transparent);
              margin: 24px 0;
              border-radius: 2px;
            }

            @media (max-width: 480px) {
              .container {
                padding: 36px 24px;
              }

              h1 {
                font-size: 24px;
              }

              .icon-container {
                width: 70px;
                height: 70px;
              }

              .icon-container svg {
                width: 35px;
                height: 35px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon-container">
              <svg viewBox="0 0 24 24" fill="none">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            <h1>Error al Validar la Cuenta</h1>
            <div class="divider"></div>
            <p class="error-message">${errorMessage}</p>
            <p class="info-text">Por favor, intenta nuevamente o contacta con soporte si el problema persiste.</p>
          </div>
        </body>
      </html>
      `;
      const statusCode = error instanceof NotFoundException ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(statusCode).send(errorHtml);
    }
  }
}
