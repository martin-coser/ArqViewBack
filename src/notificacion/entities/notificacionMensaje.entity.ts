import { Mensaje } from "src/mensaje/entities/mensaje.entity";
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class NotificacionMensaje {
    @PrimaryGeneratedColumn()
    id: number;

    @Column( { type: 'varchar', length: 255 })
    contenido: string;

    @Column({ type: 'timestamp' })
    fechaCreacion: Date;

    @Column({ type: 'varchar', length: 255 })
    remitente: string;

    @Column({ type: 'varchar', length: 255 })
    receptor: string;

    @Column({ default: false })
    leida: boolean;

    @OneToOne(() => Mensaje, mensaje => mensaje.id)
    @JoinColumn({ name: 'mensaje_id' })
    mensaje: Mensaje;

}
