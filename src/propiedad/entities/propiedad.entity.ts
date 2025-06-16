import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm"

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

    // @ManyToOne(() => Localidad)
    // @JoinColumn({name: 'localidad_id'})
    localidad:number // clave foranea a localidad. El tipo de dato real es Localidad, se cambiara al agregar la entidad Localidad.
    
    @Column({ type:'double precision' })
    precio:number

    @Column({ type: 'integer' })
    superficie:number // el numero referencia a metros cuadrados

    // @ManyToOne(() => tipoPropiedad)
    // @JoinColumn({ name: 'tipoPropiedad_id' })
    tipoPropiedad:number // clave foranea a tipoPropiedad. Cambiar tipo de dato, Lo mismo que localidad.

    // La relacion conlleva una tabla intermedia VER.
    tipoVisualizacion:number // clave foranea a tipoVisualizacion. Cambiar tipo de dato, Lo mismo que localidad.

    // @ManyToOne(() => estiloArquitectonico)
    // @JoinColumn({ name: 'estiloArquitectonico_id' })
    estiloArquitectonico:number //clave foranea a estilo arquitectonico. Cambiar tipo de dato, Lo mismo que localidad.

    @Column({ type: 'integer' })
    cantidadBanios:number

    @Column({ type: 'integer' })
    cantidadDormitorios:number
    
    @Column({ type: 'integer' })
    cantidadAmbientes:number

}
