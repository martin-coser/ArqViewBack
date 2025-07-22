import { Provincia } from "src/provincia/entities/provincia.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Localidad {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true, length: 255 })
    nombre: string;

    @Column({ nullable: true})
    codigoPostal: number;

    @ManyToOne(() => Provincia , { eager: true })
    @JoinColumn({name: 'provincia_id'})
    provincia: Provincia; 

}
