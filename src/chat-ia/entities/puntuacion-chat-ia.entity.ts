import { Cliente } from "src/cliente/entities/cliente.entity";
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class PuntuacionChatIA {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    puntuacion: number;

    @OneToOne(() => Cliente, {eager: true, onDelete: 'CASCADE'})
    @JoinColumn({ name: 'cliente_id' })
    cliente: Cliente;
}