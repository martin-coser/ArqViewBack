import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Imagen2d {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filePath: string; // Almacena la ruta de la imagen (ej. "/imagenes2d/123456789.jpg")

  @Column({ nullable: true }) // Permitimos que sea opcional
  descripcion: string;
}