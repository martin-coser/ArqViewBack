import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterCuentaDto } from './dto/register-cuenta.dto';
import { LoginCuentaDto } from './dto/login-cuenta.dto';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerCuentaDto: RegisterCuentaDto) {
    return this.authService.register(registerCuentaDto);
  }

  @Post('login')
  async login(@Body() loginCuentaDto: LoginCuentaDto) {
    const user = await this.authService.validate(loginCuentaDto);
    return this.authService.login(user);
  }

}
