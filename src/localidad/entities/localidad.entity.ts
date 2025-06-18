import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Localidad {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true, length: 255 })
    nombre: string;

    @Column({ nullable: true})
    codigoPostal: number;

    // @ManyToOne(() => Provincia)
    // @JoinColumn({name: 'provincia_id'})
    @Column()
    provincia: number; // clave foranea a provincia. El tipo de dato real es Provincia, se cambiara al agregar la entidad Provincia.

}
