import { EstiloArquitectonico } from "src/estilo-arquitectonico/entities/estilo-arquitectonico.entity"
import { Localidad } from "src/localidad/entities/localidad.entity"
import { TipoDePropiedad } from "src/tipo-de-propiedad/entities/tipo-de-propiedad.entity"
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { TipoVisualizacion } from "./TipoVisualizacion.enum"

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

    @Column({
    type: 'enum',
    enum: TipoVisualizacion
    })
    tipoVisualizacion: TipoVisualizacion;

    @ManyToOne(() => EstiloArquitectonico, { eager: true })
    @JoinColumn({ name: 'estiloArquitectonico_id' })
    estiloArquitectonico:EstiloArquitectonico 

    @Column({ type: 'integer' })
    cantidadBanios:number

    @Column({ type: 'integer' })
    cantidadDormitorios:number
    
    @Column({ type: 'integer' })
    cantidadAmbientes:number

}
