import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Comprobante {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({type: 'varchar', length: 100})
    Pasarela: string = 'click de pago'; // Valor por defecto

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    total: number = 25.00; // Valor por defecto

    @Column({ type: 'timestamp' })
    fechaHoraEmision: Date;

    @Column({ type: 'bigint' })
    numeroDeTransaccion: number = 123456789; // Valor por defecto

    @Column({ type: 'varchar', length: 100 })
    metodoDePago: string = 'mastercard debito'; // Valor por defecto

    @Column({ type: 'bigint' })
    DNI: number = 12345678; // Valor por defecto

    @Column({ type: 'bigint' })
    numeroDeReferencia: number = 250911123328257; // Valor por defecto

    // Opcionalmente, puedes usar un constructor para una inicialización más dinámica
    constructor() {
        this.fechaHoraEmision = new Date();
    }
}