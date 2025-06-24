export interface JwtPayload {
  username: string;
  sub: number; // o string, según tu base de datos
  rol: string; // o enum si lo tipificaste así
}
