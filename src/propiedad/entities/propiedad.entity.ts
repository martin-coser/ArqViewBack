import { EstiloArquitectonico } from "src/estilo-arquitectonico/entities/estilo-arquitectonico.entity"
import { Localidad } from "src/localidad/entities/localidad.entity"
import { TipoDePropiedad } from "src/tipo-de-propiedad/entities/tipo-de-propiedad.entity"
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { TipoOperacion } from "./TipoOperacion.enum"
import { TipoDeVisualizacion } from "src/tipo-de-visualizacion/entities/tipo-de-visualizacion.entity"


@Entity()
export class Propiedad {

    @PrimaryGeneratedColumn()
    id: number

    @Column({ type: 'varchar', length: 255 })
    nombre: string

    @Column({ type: 'varchar', length: 255 })
    descripcion:string

    @Column({unique: true, type: 'varchar', length: 255 })
    direccion: string // uruguay 1340

    @ManyToOne(() => Localidad, { eager: true })
    @JoinColumn({name: 'localidad_id'})
    localidad:Localidad 
    
    @Column({ type:'double precision' })
    precio:number

    @Column({ type: 'integer' })
    superficie:number // el numero referencia a metros cuadrados

    @ManyToOne(() => TipoDePropiedad, { eager: true })
    @JoinColumn({ name: 'tipoDePropiedad_id' })
    tipoPropiedad:TipoDePropiedad 

    @ManyToMany(() => TipoDeVisualizacion, { eager: true })
    @JoinTable({
        name: 'propiedad_tipo_visualizacion',
        joinColumn: { name: 'propiedad_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'tipo_visualizacion_id', referencedColumnName: 'id' },
    })
    tipoVisualizaciones: TipoDeVisualizacion[];

    @ManyToOne(() => EstiloArquitectonico, { eager: true })
    @JoinColumn({ name: 'estiloArquitectonico_id' })
    estiloArquitectonico:EstiloArquitectonico 

    @Column({ type: 'integer' })
    cantidadBanios:number

    @Column({ type: 'integer' })
    cantidadDormitorios:number
    
    @Column({ type: 'integer' })
    cantidadAmbientes:number

    @Column({
    type: 'enum',
    enum: TipoOperacion
    })
    tipoOperacion: TipoOperacion;

}
