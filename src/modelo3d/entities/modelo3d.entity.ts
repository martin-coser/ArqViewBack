import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Modelo3D {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filePath: string; 

  @Column({ nullable: true }) 
  descripcion: string;
  
  @OneToOne(() => Propiedad, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propiedad_id' })
  propiedad: Propiedad;
}