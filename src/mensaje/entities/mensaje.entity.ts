import { Cliente } from "src/cliente/entities/cliente.entity";
import { Inmobiliaria } from "src/inmobiliaria/entities/inmobiliaria.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Mensaje {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    contenido: string;

    @ManyToOne(() => Cliente, cliente => cliente.id)
    remitenteCliente: Cliente;

    @ManyToOne(() => Inmobiliaria, inmobiliaria => inmobiliaria.id)
    remitenteInmobiliaria: Inmobiliaria;

    @ManyToOne(() => Cliente, cliente => cliente.id)
    receptorCliente: Cliente;

    @ManyToOne(() => Inmobiliaria, inmobiliaria => inmobiliaria.id)
    receptorInmobiliaria: Inmobiliaria;

    @CreateDateColumn()
    fechaCreacion: Date;
}