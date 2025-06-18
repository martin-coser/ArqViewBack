import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class TipoDeVisualizacion {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true, type: 'varchar' , length: 255 })
    nombre: string;

    @Column({nullable: true, type: 'varchar' , length: 255})
    descripcion: string
}
