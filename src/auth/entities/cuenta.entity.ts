import { Cliente } from 'src/cliente/entities/cliente.entity';
import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Cuenta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  nombreUsuario: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string; // Hash con bcrypt en producción

  @Column({
    type: 'enum',
    enum: ['ADMIN', 'CLIENTE', 'INMOBILIARIA'],
    default: 'CLIENTE',
  })
  rol: 'ADMIN' | 'CLIENTE' | 'INMOBILIARIA';

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  login: Date;

  @Column({ type: 'timestamp', nullable: true })
  logout: Date;

}