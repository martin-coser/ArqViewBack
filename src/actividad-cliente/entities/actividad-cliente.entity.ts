import { Cliente } from "src/cliente/entities/cliente.entity";
import { Propiedad } from "src/propiedad/entities/propiedad.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ActividadCliente {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
    type: 'enum',
    enum: ['VISUALIZACION', 'CONSULTA', 'LISTADEINTERES'],
    })
    tipoDeActividad: 'VISUALIZACION' | 'CONSULTA' | 'LISTADEINTERES';

    @Column({type: 'timestamp'})
    fechaYHoraActividad: Date;
    

    // Un cliente puede tener muchas actividades
    @ManyToOne(() => Cliente, {eager: true,onDelete: 'CASCADE'})
    @JoinColumn({ name: 'cliente_id' })
    cliente: Cliente;

    // Una propiedad puede estar asociada a muchas actividades de clientes
    @ManyToOne(() => Propiedad, {eager: true,onDelete: 'CASCADE'})
    @JoinColumn({ name: 'propiedad_id' })
    propiedad: Propiedad;

}
