import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Imagen2d {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filePath: string; // Almacena la ruta de la imagen (ej. "/imagenes2d/123456789.jpg")

  @Column({ nullable: true }) // Permitimos que sea opcional
  descripcion: string;

  //muchas imagenes pertecen a una propiedad
  @ManyToOne(() => Propiedad, {eager: true,onDelete: 'CASCADE'})
  @JoinColumn({ name: 'propiedad_id' })
  propiedad: Propiedad
}