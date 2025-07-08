import { Cuenta } from "src/auth/entities/cuenta.entity";
import { listaDeInteres } from "src/lista-de-interes/entities/lista-de-intere.entity";
import { Localidad } from "src/localidad/entities/localidad.entity";

import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

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
    
    @ManyToOne(() => Cuenta , { eager: true })
    @JoinColumn({name: 'cuenta_id'})
    cuenta: Cuenta; // clave foranea a cuenta. */ 
    
    @ManyToOne(() => Localidad , { eager: true })
    @JoinColumn({name: 'localidad_id'})
    localidad: Localidad; // clave foranea a localidad.

    @OneToMany(() => listaDeInteres, (listaDeInteres: listaDeInteres) => listaDeInteres.cliente)
    intereses: listaDeInteres[]; 
}
