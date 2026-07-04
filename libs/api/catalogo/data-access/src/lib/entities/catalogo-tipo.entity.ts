import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Tipos de catálogo administrables (RT-02): lengua, tipo_vivienda, ocupacion, etc. */
@Entity('catalogo_tipos')
export class CatalogoTipo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 60, unique: true })
  codigo!: string;

  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({ type: 'boolean', default: false })
  jerarquico!: boolean;
}
