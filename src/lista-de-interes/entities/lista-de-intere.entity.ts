// src/lista-de-interes/entities/interes-propiedad.entity.ts

import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, Unique } from 'typeorm';
import { Cliente } from '../../cliente/entities/cliente.entity'; // ✅ Asegúrate de que esta ruta sea correcta para tu entidad Cliente
import { Propiedad } from '../../propiedad/entities/propiedad.entity'; // ✅ Asegúrate de que esta ruta sea correcta para tu entidad Propiedad

@Entity()
@Unique(['cliente', 'propiedad']) // Asegura que un cliente no pueda tener el mismo interés en la misma propiedad más de una vez
export class listaDeInteres {
    
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    fechaAgregado: Date;

    @ManyToOne(() => Cliente, cliente => cliente.intereses, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'clienteId' }) // La columna FK en esta tabla será 'clienteId'
    cliente: Cliente;

    @ManyToOne(() => Propiedad, propiedad => propiedad.intereses, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'propiedadId' }) //  Esta es la FK propiedadId
    propiedad: Propiedad;

}