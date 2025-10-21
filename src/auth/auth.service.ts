import { BadRequestException, Body, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cuenta } from './entities/cuenta.entity';
import { EntityManager, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { RegisterCuentaDto } from './dto/register-cuenta.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginCuentaDto } from './dto/login-cuenta.dto';
import { MailerService } from '@nestjs-modules/mailer';


@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Cuenta)
    private cuentaRepository: Repository<Cuenta>,
    private jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  async register(registerCuentaDto: RegisterCuentaDto, entityManager?: EntityManager): Promise<Cuenta> {
    const { nombreUsuario, password, email, rol } = registerCuentaDto;

    // Usar el entityManager si se proporciona, de lo contrario usar el repositorio
    const manager = entityManager || this.cuentaRepository.manager;

    // Verificar si el nombre de usuario ya existe
    const cuentaPorNombre = await manager.findOne(Cuenta, { where: { nombreUsuario }});
    if (cuentaPorNombre) {
      throw new BadRequestException('El nombre de usuario ya está en uso');
    }

    // Verificar si el email ya existe
    const cuentaPorEmail = await manager.findOne(Cuenta, {where: { email },});
    
    if (cuentaPorEmail) {
      throw new BadRequestException('El email ya está en uso');
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    const validationToken = crypto.randomBytes(32).toString('hex');

    // Crear la entidad Cuenta
    const cuenta = manager.create(Cuenta, {
      nombreUsuario,
      email,
      password: hashedPassword,
      rol,
      login: new Date(),
      estado: 'PENDIENTE',
      validationToken,
    });

    const nuevaCuenta = await manager.save(cuenta); 

    //Llamar a la funcion para enviar el correo de validacion
    await this.enviarCorreoValidacion(nuevaCuenta.email, validationToken)

    // Guardar la cuenta
    return nuevaCuenta;
  }

  // Método para enviar el correo de validación
  private async enviarCorreoValidacion(email: string, token: string): Promise<void> {
    const validationUrl = `http://localhost:3000/auth/validate/${token}`; 
    await this.mailerService.sendMail({
      to: email,
      subject: 'Validación de cuenta',
      html: `
        <p>¡Hola!</p>
        <p>Gracias por registrarte. Por favor, haz clic en el siguiente enlace para validar tu cuenta:</p>
        <a href="${validationUrl}">Validar mi cuenta</a>
        <p>Si no te registraste, puedes ignorar este correo.</p>
      `,
    });
  }

  async validateAccount(validationToken: string): Promise<string> {
    const cuenta = await this.cuentaRepository.findOne({ where: { validationToken } });

    if (!cuenta) {
      throw new NotFoundException('Token de validación inválido o expirado.');
    }

    cuenta.estado = 'ACTIVO';
    cuenta.validationToken = null;
    await this.cuentaRepository.save(cuenta);

    return '¡Cuenta validada con éxito! Ya puedes iniciar sesión.';
  }



  async validate(LoginCuentaDto: LoginCuentaDto): Promise<Omit<Cuenta, 'password'>> { // devuelvo la cuenta sin password, tambien puedo crear una interface y ponerla como lo que devuelve.

    const { nombreUsuario, password } = LoginCuentaDto;
    const cuenta = await this.cuentaRepository.findOne({ where: { nombreUsuario } })

    if (!cuenta || !(await bcrypt.compare(password, cuenta.password))) {
      throw new UnauthorizedException('Credenciales inválidas')
    }

    if (cuenta.estado !== 'ACTIVO') {
      throw new UnauthorizedException('Tu cuenta aún no ha sido validada. Por favor, revisa tu correo electrónico.');
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
