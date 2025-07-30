
import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, Unique, OneToOne, ManyToMany, JoinTable } from 'typeorm';
import { Cliente } from '../../cliente/entities/cliente.entity';
import { Propiedad } from '../../propiedad/entities/propiedad.entity'; 

@Entity()
export class ListaDeInteres {
    
    @PrimaryGeneratedColumn()
    id: number;
    
    @OneToOne(() => Cliente, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cliente_id', referencedColumnName: 'id' })
    cliente: Cliente;
  
    @ManyToMany(() => Propiedad)
    @JoinTable({
    name: 'lista_de_interes_propiedades',
    joinColumn: { name: 'listaDeInteres_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'propiedad_id', referencedColumnName: 'id' },
  })
  propiedades: Propiedad[];
}