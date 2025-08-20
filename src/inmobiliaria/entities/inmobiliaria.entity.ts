import { Cuenta } from "src/auth/entities/cuenta.entity";
import { Localidad } from "src/localidad/entities/localidad.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Inmobiliaria {
    @PrimaryGeneratedColumn()
    id: number

    @Column({type: 'varchar' , length: 255})
    nombre: string

    @Column({ type: 'varchar', length: 255, unique: true })
    direccion: string // uruguay 1340


    @ManyToOne(() => Localidad, { eager: true })
    @JoinColumn({name: 'localidad_id'})
    localidad:Localidad 

    @OneToOne( () => Cuenta, {onDelete:'CASCADE' ,eager:true})
    @JoinColumn({name: 'cuenta_id'})
    cuenta:Cuenta // clave foranea.

}
