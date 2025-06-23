import { Localidad } from "src/localidad/entities/localidad.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Cliente {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    nombre: string;

    @Column()
    apellido: string;

    @Column()
    fechaNacimiento: Date;

    @Column()
    direccion: string;
    
    /* @ManyToOne(() => Cuenta , { eager: true })
        @JoinColumn({name: 'cuenta_id'})
        provincia: Cuenta; // clave foranea a cuenta. */

    @ManyToOne(() => Localidad , { eager: true })
        @JoinColumn({name: 'localidad_id'})
        localidad: Localidad; // clave foranea a localidad.
}
