import { Cliente } from "src/cliente/entities/cliente.entity";
import { Inmobiliaria } from "src/inmobiliaria/entities/inmobiliaria.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class CalificacionResena {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type : 'varchar' })
    reseña: string;

    @Column({ type : 'int' })
    calificacion: number; // del 1 al 5

    @Column({ type : 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    fechaCreacion: Date;

    @ManyToOne(() => Cliente , { eager: true })
    cliente: Cliente; // clave foranea a cliente.

    @ManyToOne(() => Inmobiliaria , { eager: true })
    inmobiliaria: Inmobiliaria; // clave foranea a inmobiliaria.
}
