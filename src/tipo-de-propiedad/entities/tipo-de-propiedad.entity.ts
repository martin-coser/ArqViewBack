import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class TipoDePropiedad {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true, length: 255 })
    nombre: string;

    @Column({nullable: true, length: 255})
    descripcion: string

}
