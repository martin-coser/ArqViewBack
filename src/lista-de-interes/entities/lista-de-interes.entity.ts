
import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, Unique, OneToOne, ManyToMany, JoinTable } from 'typeorm';
import { Cliente } from '../../cliente/entities/cliente.entity';
import { Propiedad } from '../../propiedad/entities/propiedad.entity'; 
import { IsString } from 'class-validator';

@Entity()
export class ListaDeInteres {
    
    @PrimaryGeneratedColumn()
    id: number;
    
    @OneToOne(() => Cliente, cliente => cliente.listaDeInteres, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'clienteId', referencedColumnName: 'id' })
    cliente: Cliente;

    @ManyToMany(() => Propiedad, propiedad => propiedad.listasDeInteres)
    @JoinTable({
    name: 'lista_de_interes_propiedades',
    joinColumn: { name: 'listaDeInteresId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'propiedadId', referencedColumnName: 'id' },
  })
  propiedades: Propiedad[];
}