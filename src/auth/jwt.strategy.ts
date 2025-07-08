import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Cuenta } from "./entities/cuenta.entity";
import { Repository } from "typeorm";
import { JwtPayload } from "./interfaces/payload.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(Cuenta)
    private cuentaRepository: Repository<Cuenta>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'FRANCOCOLAPINTO',
    });
  }

  async validate(payload: JwtPayload) {
    const cuenta = await this.cuentaRepository.findOne({ where: { id: payload.sub } });
    if (!cuenta) {
      throw new UnauthorizedException();
    }
    return { id: cuenta.id, nombreUsuario: cuenta.nombreUsuario, rol: cuenta.rol };
  }
}