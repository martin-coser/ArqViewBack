import { Cuenta } from "src/auth/entities/cuenta.entity";
import { Localidad } from "src/localidad/entities/localidad.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Inmobiliaria {
    @PrimaryGeneratedColumn()
    id: number

    @Column({type: 'varchar' , length: 255})
    nombre: string

    @Column({ type: 'varchar', length: 255, unique: true })
    direccion: string

    @Column({ type: 'varchar', length: 10, nullable: true })
    codigoPais: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    numeroTelefono: string;

    @ManyToOne(() => Localidad, { eager: true })
    @JoinColumn({name: 'localidad_id'})
    localidad:Localidad 

    @OneToOne( () => Cuenta, {onDelete:'CASCADE' ,eager:true})
    @JoinColumn({name: 'cuenta_id'})
    cuenta:Cuenta // clave foranea.

    @Column({
        type: 'enum',
        enum: ['BASICO', 'PREMIUM'],
        default: 'BASICO',
      })
    plan:'BASICO' | 'PREMIUM';

    @Column({ type: 'timestamp', nullable: true })
    fechaSuscripcion: Date | null; // Fecha que se suscribio o renovo y a partir de la cual se cuentan los 30 dias.

    @Column({ type: 'timestamp', nullable: true })
    fechaVencimiento: Date | null; // Fecha en la que vence la suscripcion.

    //Atributos para FREEMIUM
    @Column({ type: 'timestamp', nullable: true })
    fechaComienzoFreemium: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    fechaFinFreemium: Date | null; 

    fueFreemium(): boolean {
        return this.fechaFinFreemium !== null;
    }
}
