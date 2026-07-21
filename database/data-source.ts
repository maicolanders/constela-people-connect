import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Auditoria } from '../libs/api/shared/data-access/src/lib/entities/auditoria.entity';
import { RefreshToken } from '../libs/api/auth/data-access/src/lib/entities/refresh-token.entity';
import { Rol } from '../libs/api/auth/data-access/src/lib/entities/rol.entity';
import { Usuario } from '../libs/api/auth/data-access/src/lib/entities/usuario.entity';
import { UsuarioRol } from '../libs/api/auth/data-access/src/lib/entities/usuario-rol.entity';
import { Comunidad } from '../libs/api/comunidad/data-access/src/lib/entities/comunidad.entity';
import { PeriodoCensal } from '../libs/api/periodo-censal/data-access/src/lib/entities/periodo-censal.entity';
import { CatalogoItem } from '../libs/api/catalogo/data-access/src/lib/entities/catalogo-item.entity';
import { CatalogoTipo } from '../libs/api/catalogo/data-access/src/lib/entities/catalogo-tipo.entity';
import { UbicacionGeografica } from '../libs/api/georreferenciacion/data-access/src/lib/entities/ubicacion-geografica.entity';
import { HogarUbicacion } from '../libs/api/georreferenciacion/data-access/src/lib/entities/hogar-ubicacion.entity';
import { Vivienda } from '../libs/api/vivienda/data-access/src/lib/entities/vivienda.entity';
import { VivendaServicio } from '../libs/api/vivienda/data-access/src/lib/entities/vivienda-servicio.entity';
import { HabitanteEducacion } from '../libs/api/educacion/data-access/src/lib/entities/habitante-educacion.entity';
import { HabitanteLengua } from '../libs/api/educacion/data-access/src/lib/entities/habitante-lengua.entity';
import { Hogar } from '../libs/api/poblacion/data-access/src/lib/entities/hogar.entity';
import { Habitante } from '../libs/api/poblacion/data-access/src/lib/entities/habitante.entity';
import { HabitanteRefreshToken } from '../libs/api/poblacion/data-access/src/lib/entities/habitante-refresh-token.entity';
import { HabitanteOcupacion } from '../libs/api/economia/data-access/src/lib/entities/habitante-ocupacion.entity';
import { MovimientoMigratorio } from '../libs/api/migracion/data-access/src/lib/entities/movimiento-migratorio.entity';
import { HabitanteEtnia } from '../libs/api/etnia-vulnerabilidad/data-access/src/lib/entities/habitante-etnia.entity';
import { HabitanteCondicionVulnerabilidad } from '../libs/api/etnia-vulnerabilidad/data-access/src/lib/entities/habitante-condicion-vulnerabilidad.entity';
import { Presupuesto } from '../libs/api/recursos/data-access/src/lib/entities/presupuesto.entity';
import { Notificacion } from '../libs/api/periodo-censal/data-access/src/lib/entities/notificacion.entity';

try {
  // Node 20.6+: carga .env sin depender de la librería `dotenv`.
  process.loadEnvFile();
} catch {
  // No hay .env (p.ej. en CI con variables ya inyectadas al entorno): se ignora.
}

/**
 * DataSource usado por el CLI de TypeORM (migration:run/generate/revert, ver
 * apps/api/project.json) y por los seeders en database/seeders. La app en
 * runtime configura su propio TypeOrmModule (apps/api/src/app/app.module.ts)
 * con las mismas entidades pero `synchronize: false` siempre — el esquema
 * solo cambia vía estas migraciones.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env['DB_HOST'] ?? 'localhost',
  port: Number(process.env['DB_PORT'] ?? 5432),
  username: process.env['DB_USER'] ?? 'censo',
  password: process.env['DB_PASSWORD'] ?? 'censo',
  database: process.env['DB_NAME'] ?? 'censo_indigena',
  entities: [
    Auditoria,
    Usuario,
    Rol,
    UsuarioRol,
    RefreshToken,
    Comunidad,
    PeriodoCensal,
    CatalogoTipo,
    CatalogoItem,
    UbicacionGeografica,
    HogarUbicacion,
    Vivienda,
    VivendaServicio,
    HabitanteEducacion,
    HabitanteLengua,
    Hogar,
    Habitante,
    HabitanteRefreshToken,
    HabitanteOcupacion,
    MovimientoMigratorio,
    HabitanteEtnia,
    HabitanteCondicionVulnerabilidad,
    Presupuesto,
    Notificacion,
  ],
  migrations: ['database/migrations/*.ts'],
  synchronize: false,
});
