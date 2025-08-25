import { Propiedad } from "src/propiedad/entities/propiedad.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Imagen360 {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    filePath: string; // Almacena la ruta de la imagen (ej. "/imagenes360/123456789.jpg")

    //muchas imagenes360 pertecen a una propiedad
    @ManyToOne(() => Propiedad, {eager: true,onDelete: 'CASCADE'})
    @JoinColumn({ name: 'propiedad_id' })
    propiedad: Propiedad
}
