import { Cuenta } from "src/auth/entities/cuenta.entity";
import { ListaDeInteres } from "src/lista-de-interes/entities/lista-de-interes.entity";
import { Localidad } from "src/localidad/entities/localidad.entity";

import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Cliente {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type : 'varchar', length: 255 })
    nombre: string;

    @Column({ type : 'varchar', length: 255 })
    apellido: string;

    @Column({ type : 'date' })
    fechaNacimiento: Date;

    @Column({ type : 'varchar', length: 255 })
    direccion: string;
    
    @OneToOne(() => Cuenta, cuenta => cuenta.cliente, { onDelete: 'CASCADE' }) 
    @JoinColumn({name: 'cuenta_id'})
    cuenta: Cuenta;  
    
    @ManyToOne(() => Localidad , { eager: true })
    @JoinColumn({name: 'localidad_id'})
    localidad: Localidad; // clave foranea a localidad.

    @OneToOne(() => ListaDeInteres, listaDeInteres => listaDeInteres.cliente, { cascade: ['insert', 'update', 'remove'] })
    listaDeInteres: ListaDeInteres;
}
