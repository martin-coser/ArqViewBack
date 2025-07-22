import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterCuentaDto } from './dto/register-cuenta.dto';
import { LoginCuentaDto } from './dto/login-cuenta.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from 'src/decoradores/roles.decorator';
import { Cuenta } from './entities/cuenta.entity';


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
}
