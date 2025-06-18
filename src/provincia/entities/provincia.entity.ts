import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Provincia {
 @PrimaryGeneratedColumn()
 id: number;

 @Column({ unique: true, length: 255 })
 nombre: string;   
}
