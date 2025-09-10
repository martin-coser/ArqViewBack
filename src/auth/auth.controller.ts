import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Res, UseGuards, HttpStatus, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterCuentaDto } from './dto/register-cuenta.dto';
import { LoginCuentaDto } from './dto/login-cuenta.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from 'src/decoradores/roles.decorator';
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
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async findAll(): Promise<RegisterCuentaDto[]> {
    return await this.authService.findAll()
  }

  @Post('verificarPass/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENTE', 'INMOBILIARIA') 
  async verificarPass(@Param('id', ParseIntPipe) id: number, @Body() body: { oldPassword: string }) {
    return await this.authService.verificarPass(id, body);
  }

  @Patch('/updatePass/:id')
  @UseGuards(AuthGuard('jwt'))
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
      <html>
        <head>
          <title>Cuenta Validada</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding-top: 50px; background-color: #f0f0f0; }
            .container { background-color: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); display: inline-block; }
            h1 { color: #4CAF50; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ ¡Cuenta Validada!</h1>
            <p>${result}</p>
            <p>Ya puedes cerrar esta ventana e iniciar sesión en la aplicación.</p>
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
        <html>
          <head>
            <title>Error en la Validación</title>
            <style>
              body { font-family: sans-serif; text-align: center; padding-top: 50px; background-color: #f0f0f0; }
              .container { background-color: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); display: inline-block; }
              h1 { color: #f44336; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Error al Validar la Cuenta</h1>
              <p>${errorMessage}</p>
            </div>
          </body>
        </html>
      `;
      const statusCode = error instanceof NotFoundException ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(statusCode).send(errorHtml);
    }
  }
}
