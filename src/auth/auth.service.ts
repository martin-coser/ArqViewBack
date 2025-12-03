import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cuenta } from './entities/cuenta.entity';
import { EntityManager, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { RegisterCuentaDto } from './dto/register-cuenta.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { LoginCuentaDto } from './dto/login-cuenta.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { HttpService } from '@nestjs/axios'; 
import { firstValueFrom } from 'rxjs'; 

//definicion de interfaz de respuesta de api de google recaptcha
interface RecaptchaResponse {
    success: boolean;
    score: number;
    'error-codes'?: string[]; // La propiedad lleva guion, es importante
    hostname?: string;
    challenge_ts?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Cuenta)
    private cuentaRepository: Repository<Cuenta>,
    private jwtService: JwtService,
    private readonly mailerService: MailerService,
    private httpService: HttpService,
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

  private async verifyRecaptcha(token: string, ip: string): Promise<number> {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      // Manejo de error si la clave no está configurada (CRÍTICO)
      console.error('RECAPTCHA_SECRET_KEY no configurada. Saltando verificación.');
      return 1.0; 
    }
    
    const verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';

    const params = new URLSearchParams();
    params.append('secret', secretKey);
    params.append('response', token);
    params.append('remoteip', ip); 
    
    try {
        const response = await firstValueFrom(
            this.httpService.post<RecaptchaResponse>(verificationUrl, params),
        );
        const data = response.data;

        if (!data.success) {
            // Falla de Google (ej: token inválido, expirado)
            console.error('reCAPTCHA verification failed:', data['error-codes']);
            // Decisión: Score bajo para forzar el bloqueo.
            return 0.0;
        }

        return data.score;

    } catch (error) {
        // Fallback: Error de red o servicio de Google caído
        console.error('reCAPTCHA service error (network/timeout):', error.message);
        
        // Decisión de Fallback: Devolver 1.0 para que el login pueda proceder 
        // (priorizando la disponibilidad sobre la seguridad estricta temporalmente).
        return 1.0; 
    }
}

  async validate(LoginCuentaDto: LoginCuentaDto, clienteIp : string): Promise<Omit<Cuenta, 'password'>> { // devuelvo la cuenta sin password, tambien puedo crear una interface y ponerla como lo que devuelve.

    const { nombreUsuario, password, recaptchaToken } = LoginCuentaDto;

    //verificar el score V3
    const score = await this.verifyRecaptcha(recaptchaToken,clienteIp);

    // Umbral de decisión: Si el score es bajo, bloqueamos
    if(score < 0.5){
      //se pide v2
      console.warn(`Intento de login sospechoso: IP ${clienteIp}, Usuario ${nombreUsuario}, Score ${score}. Solicitando V2.`);
      // Lanzamos una excepción genérica para no dar pistas al atacante
      throw new UnauthorizedException({ message: 'Fallo en la verificación de seguridad. Se requiere desafío V2.',
        requiresV2: true // Propiedad específica para el frontend
      });
    }

    // verificacion de credenciales
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

    /**
   * Método para verificar el token generado por el desafío de reCAPTCHA V2 (el "no soy un robot").
   * Se comunica con la API de Google para validar si el usuario resolvió el desafío correctamente.
   */
  private async verifyRecaptchaV2(token: string, ip: string): Promise<boolean> {
      // 1. Obtener la clave secreta
      const secretKey = process.env.RECAPTCHA_SECRET_KEY;
      if (!secretKey) {
          // Fallo de configuración crítico
          console.error('RECAPTCHA_SECRET_KEY no configurada. No se puede verificar V2.');
          return false; 
      }
      
      const verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';

      // 2. Construir los parámetros de la solicitud
      const params = new URLSearchParams();
      params.append('secret', secretKey); // La clave privada para autenticar la solicitud
      params.append('response', token);   // El token generado por el frontend (g-recaptcha-response)
      params.append('remoteip', ip);      // La IP del cliente para el análisis de riesgo de Google
      
      try {
          // 3. Enviar la solicitud POST a la API de Google
          // Usamos la interfaz RecaptchaResponse (solo nos interesa la propiedad 'success').
          const response = await firstValueFrom(
              this.httpService.post<RecaptchaResponse>(verificationUrl, params),
          );
          //esta data tiene la respuesta de google
          const data = response.data;

          if (!data.success) {
              // 4. Verificación fallida (el token expiró, no fue resuelto, o es inválido)
              console.error('reCAPTCHA V2 verification failed:', data['error-codes']);
              return false;
          }

          // 5. Verificación exitosa
          // Si Google devuelve 'success: true', el usuario resolvió el desafío v2.
          return true; 

      } catch (error) {
          // 6. Fallo de servicio (Error de red, timeout, Google no responde)
          console.error('reCAPTCHA V2 service error (network/timeout):', error.message);
          
          // Política de seguridad: Si el servicio está caído, negamos el acceso para un desafío V2
          // porque no podemos confirmar que el usuario es humano.
          return false; 
      }
  }

  /**
 * Valida un intento de login que ya ha resuelto el desafío V2.
 * Esta función debe ser llamada por un NUEVO endpoint en el Controller (ej: POST /auth/login/v2).
 * Recibe el token V2 del formulario y procede con el login si la verificación es exitosa.
 */
  async validateAfterV2(LoginCuentaDto: LoginCuentaDto, clienteIp: string): Promise<Omit<Cuenta, 'password'>> {
    // Extraemos las credenciales y el token V2 (renombrando recaptchaToken a v2Token para claridad)
    const { nombreUsuario, password, recaptchaToken: v2Token } = LoginCuentaDto;

    // 1. Verificar el token V2
    // La función verifyRecaptchaV2() llama a Google para confirmar que el desafío fue resuelto.
    const isV2Verified = await this.verifyRecaptchaV2(v2Token, clienteIp);

    if (!isV2Verified) {
        // Si el usuario falló al resolver el CAPTCHA V2, se lanza una excepción de seguridad.
        console.warn(`Bloqueo V2: IP ${clienteIp}, Usuario ${nombreUsuario}. Falló la resolución del desafío.`);
        throw new UnauthorizedException('Fallo al resolver el desafío de seguridad V2.');
    }

    // 2. Si V2 es exitoso, procedemos con la verificación de credenciales
    const cuenta = await this.cuentaRepository.findOne({ where: { nombreUsuario } });

    // Verificación de existencia de cuenta y contraseña
    if (!cuenta || !(await bcrypt.compare(password, cuenta.password))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificación de estado de cuenta
    if (cuenta.estado !== 'ACTIVO') {
      throw new UnauthorizedException('Tu cuenta aún no ha sido validada. Por favor, revisa tu correo electrónico.');
    }

    // 3. Retorno exitoso (excluyendo la contraseña)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...cuentaSinPassword } = cuenta;
    return cuentaSinPassword;
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
