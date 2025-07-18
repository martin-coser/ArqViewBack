import { Cliente } from "src/cliente/entities/cliente.entity";
import { Propiedad } from "src/propiedad/entities/propiedad.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Notificacion {
@PrimaryGeneratedColumn()
  id: number;

  @Column( { type: 'varchar', length: 255 })
  mensaje: string;

  @Column(  { type: 'varchar', length: 100 })
  tipo: string;  // Ejemplo: 'PROPIEDAD_ACTUALIZADA'

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;

  @Column({ default: false })
  leida: boolean;

  @ManyToOne(() => Cliente, cliente => cliente.notificaciones)
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente;

  @ManyToOne(() => Propiedad, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propiedad_id' })
  propiedad: Propiedad;
}
