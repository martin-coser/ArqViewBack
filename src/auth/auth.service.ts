import { BadRequestException, Body, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
    // Verificar si el nombre de usuario ya existe
    const cuentaPorNombre = await this.cuentaRepository.findOne({ where: { nombreUsuario } });
    if (cuentaPorNombre) {
      throw new NotFoundException('El nombre de usuario ya está en uso');
    }
    // Verificar si el email ya existe
    const cuentaPorEmail = await this.cuentaRepository.findOne({ where: { email } });
    if (cuentaPorEmail) {
      throw new NotFoundException('El email ya está en uso');
    }
    
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
      rol: user.rol,
      email: user.email
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async findAll(): Promise<Cuenta[]> {
    const cuentas = await this.cuentaRepository.find();
    if (!cuentas || cuentas.length === 0) {
      throw new NotFoundException('No se encontraron cuentas');
    }
    return cuentas;
  }

  async verificarPass(id: number, body: {oldPassword: string}): Promise<string> {
    const cuenta = await this.cuentaRepository.findOne({ where: { id } });
    if (!cuenta) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    const esContraseñaValida = await bcrypt.compare(body.oldPassword, cuenta.password);

    if (!esContraseñaValida) {
      throw new NotFoundException('Contraseña incorrecta');
    }

    return 'Contraseña verificada correctamente';
  }   

  async updatePass(id: number, body: { newPassword: string }): Promise<string> {
    const cuenta = await this.cuentaRepository.findOne({ where: { id : id  } }); 
    if (!cuenta) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    const passwordEncriptada = await bcrypt.hash(body.newPassword, 10);
    cuenta.password = passwordEncriptada;
    await this.cuentaRepository.save(cuenta);

    return 'Contraseña actualizada correctamente';
  }

}
