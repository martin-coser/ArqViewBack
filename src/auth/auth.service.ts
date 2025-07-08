import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cuenta } from './entities/cuenta.entity';
import { Repository } from 'typeorm';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';
import { JwtService } from '@nestjs/jwt';
import { RegisterCuentaDto } from './dto/register-cuenta.dto';
import * as bcrypt from 'bcrypt'
import { LoginCuentaDto } from './dto/login-cuenta.dto';


@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Cuenta)
    private cuentaRepository: Repository<Cuenta>,
    @InjectRepository(Cliente)
    private clienteRepository: Repository<Cliente>,
    @InjectRepository(Inmobiliaria)
    private inmobiliariaRepository: Repository<Inmobiliaria>,
    private jwtService: JwtService,
  ) {}

  async register(registerCuentaDto: RegisterCuentaDto): Promise<Cuenta> {
    const { nombreUsuario, password, email, rol } = registerCuentaDto
    const hashedPassword = await bcrypt.hash(password, 10)
    const cuenta = this.cuentaRepository.create({
      nombreUsuario,
      email,
      password: hashedPassword,
      rol,
      login: new Date()
    })

    await this.cuentaRepository.save(cuenta)

    return cuenta
  }


  async validate(LoginCuentaDto: LoginCuentaDto): Promise<Omit<Cuenta, 'password'>> { // devuelvo la cuenta sin password, tambien puedo crear una interface y ponerla como lo que devuelve.
    const { nombreUsuario, password } = LoginCuentaDto;
    const cuenta = await this.cuentaRepository.findOne({ where: { nombreUsuario } })

    if (!cuenta || !(await bcrypt.compare(password, cuenta.password))) {
      throw new UnauthorizedException('Credenciales inválidas')
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...cuentaSinPassword } = cuenta
    return cuentaSinPassword
  }

  async login(user: Omit<Cuenta, 'password'>) {
    const payload = { 
      username: user.nombreUsuario, 
      sub: user.id, 
      rol: user.rol 
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

}
