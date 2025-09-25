import { Propiedad } from "src/propiedad/entities/propiedad.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Imagen360 {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    filePath: string; 

    @Column({ nullable: true }) 
    descripcion: string;

    
    @ManyToOne(() => Propiedad, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'propiedad_id' })
    propiedad: Propiedad


}
