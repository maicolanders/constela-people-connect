# Progreso de construcción — Censo Poblacional Indígena Multi-Comunidad

Última actualización: 2026-07-08 (Fase 8 completada)

Referencias:
- Detalle funcional/no funcional completo: `docs/requerimientos_censo_indigena.json`
- Detalle de fases y decisiones de arquitectura: plan de sesión `ayudame-planeando-la-consutrucci-n-iridescent-mist` (Fase 0 detallada, Fases 1-10 a nivel de roadmap)

Leyenda: `[x]` completado y verificado · `[ ]` pendiente

---

## Fase 0 — Fundación — **COMPLETADA**

- [x] 0.1 Dependencias nuevas backend/frontend + `docker-compose.yml` (postgis/postgis:16-3.4) + `.env.example`
- [x] 0.2 Retiro de SSR de `apps/frontend` (server.ts, main.server.ts, app.config.server.ts, tsconfig.server.json eliminados)
- [x] 0.3 Estructura de `libs/` (shared, api, web) con tags `scope`/`type`/`domain`
- [x] 0.4 Restricciones reales de `@nx/enforce-module-boundaries` en `eslint.config.mjs` (verificado con import cruzado de prueba)
- [x] 0.5 Patrón de versionado por periodo censal (identidad vs. característica recensada) documentado y aplicado en `PeriodoCensalService.assertAbierto`
- [x] 0.6 Convención UUID para entidades capturables offline (aplicada en el diseño de `libs/web/shared/data-access`, se materializa en tablas de dominio a partir de Fase 1)
- [x] 0.7 Migraciones iniciales (10) + seeders de roles y catálogos base, corridas contra Postgres/PostGIS real
- [x] 0.8 Backend transversal: `main.ts` (ValidationPipe, CORS, Swagger `/api/docs`), `AuthModule` (JWT + refresh rotativo), `RolesGuard`/`ComunidadScopeGuard`, `AuditSubscriber` + `nestjs-cls`, `@CampoSensible()` + interceptor de redacción, `SyncModule` genérico
- [x] 0.9 Frontend transversal: interceptors de auth/error, guards de ruta, `AppDatabase` (Dexie) + outbox, `SyncService` con estrategia híbrida de conflictos, PWA (service worker + manifest), i18n español
- [x] 0.10 Testing: guards, `AuthService`, `AuditSubscriber`, `SyncService`, scoring de duplicados — 51 tests nuevos, `nx run-many -t build test lint eslint:lint --all` en verde para los 19 proyectos

### Rutas ya creadas (no regenerar con generadores Nx; extender a mano)

```
libs/shared/data-access/           libs/shared/util/
libs/api/shared/data-access/       libs/api/shared/feature/       libs/api/shared/util/
libs/api/auth/data-access/         libs/api/auth/feature/
libs/api/comunidad/data-access/    libs/api/comunidad/feature/
libs/api/periodo-censal/data-access/  libs/api/periodo-censal/feature/
libs/api/catalogo/data-access/     libs/api/catalogo/feature/
libs/web/shared/data-access/       libs/web/shared/feature/       libs/web/shared/ui/

database/migrations/1751500000000-CreatePostgisExtension.ts
database/migrations/1751500060000-CreateComunidadesTable.ts
database/migrations/1751500120000-CreateRolesTable.ts
database/migrations/1751500180000-CreateUsuariosTable.ts
database/migrations/1751500240000-CreateUsuarioRolesTable.ts
database/migrations/1751500300000-CreateRefreshTokensTable.ts
database/migrations/1751500360000-CreatePeriodosCensalesTable.ts
database/migrations/1751500420000-CreateCatalogoTiposTable.ts
database/migrations/1751500480000-CreateCatalogoItemsTable.ts
database/migrations/1751500540000-CreateAuditoriasTable.ts
database/seeders/{seed-roles,seed-catalogos-base,run-all}.ts
```

---

## Fase 1 — Población/Hogar (MOD-01) — **COMPLETADA**

- [x] Entidades: `Hogar`, `Habitante`, `HabitanteParentesco`, `HabitanteRevisionDuplicado` (`libs/api/poblacion/data-access`)
- [x] Endpoints: CRUD hogares/habitantes, `dar-baja` (transición de estado, no soft-delete), `verificar-duplicados`, `conteo`, `hogares/:id/jefe`
- [x] `libs/api/poblacion/{data-access,feature}` con `HogarService`/`HabitanteService` (transacción única al crear habitante: habitante + parentesco + jefe de hogar + revisiones de duplicado)
- [x] Primer consumidor real de `SyncHandlerRegistry` (Fase 0): `HogaresSyncHandler`/`HabitantesSyncHandler`, con resolución `hogarUuid → hogarId` y reintento si el hogar aún no sincronizó
- [x] `libs/web/poblacion/{data-access,feature}`: formulario de hogar/habitante offline-first, alerta de duplicados contra caché local (`DeteccionDuplicadosService`), pull de solo lectura de hogares/habitantes de la comunidad (`HabitantesPullService`)
- [x] Extensión de infraestructura compartida (Fase 0): `@CampoSensible({ rolesPermitidos })` y `comunidadesPermitidas`/`tieneAccesoComunidad` (`libs/api/auth/feature`) para scope por comunidad en listados y registros individuales
- [x] Tests: unicidad documento+comunidad, transacción de creación, sync handler (hogarUuid→hogarId + error de reintento), redacción de campos sensibles por rol, `DeteccionDuplicadosService`, `HabitantesPullService`, flujo de confirmación de duplicado del formulario — 24 tests nuevos (14 backend + 10 frontend)
- [x] Verificado end-to-end contra Postgres real: login + RBAC + scope de comunidad, creación de hogar/habitante, actualización automática de `jefeHogarId`, rechazo de documento duplicado (409), detección de nombre similar (score 0.96), sincronización offline vía `/api/sync/{hogares,habitantes}`, transición "dar de baja" sin soft-delete, auditoría registrada; `nx run-many -t build test lint eslint:lint --all` en verde para 23 proyectos

### Rutas creadas en Fase 1

```
libs/api/poblacion/data-access/      libs/api/poblacion/feature/
libs/web/poblacion/data-access/      libs/web/poblacion/feature/

database/migrations/1751600000000-CreateHogaresTable.ts
database/migrations/1751600060000-CreateHabitantesTable.ts
database/migrations/1751600120000-CreateHabitanteParentescosTable.ts
database/migrations/1751600180000-CreateHabitanteRevisionesDuplicadoTable.ts
```

Extensiones a libs de Fase 0 (no regenerar, ya tienen lógica): `libs/api/shared/data-access` (`CampoSensibleOptions.rolesPermitidos`), `libs/api/shared/feature` (`SensitiveFieldsInterceptor`), `libs/api/auth/feature` (`comunidad-acceso.util.ts`), `libs/shared/data-access` (enums `EstadoHogar`/`EstadoHabitante`/`SexoHabitante`/`DecisionRevisionDuplicado`), `libs/web/shared/data-access` (`AppDatabase` versión 2: tablas `hogares`/`habitantes`).

## Fase 2 — Demografía (MOD-02) — **COMPLETADA**

- [x] `Habitante` extendido: `edadEstimada` (marca de aproximación; `fechaNacimiento` sintetiza 1-enero del año estimado, una sola columna de verdad para todo el sistema) e `identidadGeneroCatalogoItemId` (catálogo `identidad_genero`, sensible con `rolesPermitidos` igual que `numeroDocumento`)
- [x] `Comunidad.capturaIdentidadGenero`: interruptor real por comunidad (RF-02-01 "configurable/activable según parametrización"); el formulario de habitante solo muestra el campo si está activo
- [x] Primera vista materializada del proyecto: `mv_indicadores_demograficos_periodo` (población 0-14/15-64/65+, altas y defunciones por periodo), refrescada automáticamente al cerrar un periodo censal vía `PeriodoCierreHookRegistry` (nuevo, mismo patrón que `SyncHandlerRegistry`)
- [x] `libs/shared/util`: `calcularRazonDependencia`, `calcularIndiceEnvejecimiento`, `calcularTasaPorMil`, y reubicación de `aplicarAnonimizacionKAnonimity` desde `libs/api/shared/util` (eliminada, vestigial) a `libs/shared/util` — cross-runtime, para que la pirámide use la misma regla RT-05 online y offline
- [x] `libs/api/demografia/{data-access,feature}`: `IndicadorDemograficoPeriodo` (`@ViewEntity` de solo lectura), `PiramidePoblacionalService` (RF-02-02, dinámica: edad contra `fechaCierre` si el periodo cerró o contra hoy si sigue abierto), `IndicadoresDemograficosService` (RF-02-03, solo periodos `cerrado`, aplica k-anonimity), endpoints `GET /demografia/{piramide,indicadores}` con exportación `?formato=csv`
- [x] `libs/web/demografia/{data-access,feature}`: pirámide poblacional como SVG nativo (sin librería de gráficos nueva) con exportación a imagen (canvas, 100% cliente) y CSV; panel de indicadores; ambos con selector de comunidad/periodo
- [x] Tests: fórmulas demográficas (con denominador 0), agrupación y supresión k-anonimity de la pirámide (backend y frontend, con fallback offline), gate de periodo cerrado e cálculo de indicadores, `PeriodoCierreHookRegistry` + `cerrar()` invocándolo, generación de CSV — 33 tests nuevos (21 backend + 12 frontend)
- [x] Verificado end-to-end contra Postgres real: comunidad con `capturaIdentidadGenero=true`, habitante con `edadEstimada` (fecha sintetizada correctamente), `identidadGeneroCatalogoItemId` visible para censista, indicadores 404 con periodo abierto → cierre de periodo dispara `REFRESH MATERIALIZED VIEW` automáticamente → indicadores correctos (razón de dependencia, índice de envejecimiento, tasas), supresión k-anonimity de buckets con 1 persona, analista con acceso a indicadores/pirámide pero no a habitantes individuales, exportación CSV con headers correctos; `nx run-many -t build test lint eslint:lint --all` en verde para 26 proyectos

### Rutas creadas en Fase 2

```
libs/api/demografia/data-access/     libs/api/demografia/feature/
libs/web/demografia/data-access/     libs/web/demografia/feature/

database/migrations/1751700000000-AlterComunidadesAddCapturaIdentidadGenero.ts
database/migrations/1751700060000-AlterHabitantesAddCamposDemograficos.ts
database/migrations/1751700120000-CreateMvIndicadoresDemograficosPeriodo.ts
```

Extensiones a libs de Fases 0-1 (no regenerar, ya tienen lógica): `libs/api/shared/data-access` (`CategoriaCampoSensible` + `'identidad-genero'`), `libs/api/shared/feature` (`PeriodoCierreHookRegistry`, nuevo), `libs/api/periodo-censal/feature` (`PeriodoCensalService.cerrar()` invoca el registro), `libs/api/comunidad/data-access` (`Comunidad.capturaIdentidadGenero`), `libs/api/poblacion/data-access` (`Habitante.edadEstimada`/`identidadGeneroCatalogoItemId`), `libs/shared/util` (`anonimizacion.ts` movido aquí desde `libs/api/shared/util`, que se eliminó por quedar vacío), `libs/web/poblacion/feature` (`HabitanteFormComponent` con edad estimada/identidad de género condicional).

## Fase 3 — Georreferenciación (MOD-03) — **COMPLETADA**

- [x] `UbicacionGeografica` (`ubicaciones_geograficas`): árbol real de lugares (país→departamento→municipio→resguardo/territorio→vereda), autoreferenciado por `padreId` (mismo patrón que `CatalogoItem`), clasificado por el catálogo plano `nivel_geografico` (ya sembrado en Fase 0/seed, sin usar hasta ahora). No reutiliza `catalogo_items` genérico para los lugares reales (saturaría el catálogo administrable con miles de municipios/veredas); sí para `nivel_geografico`/`tipo_territorio`, ambos ya seeded.
- [x] `HogarUbicacion` (`hogar_ubicaciones`): captura GPS de un hogar — `coordenadas geometry(Point,4326)` (primer uso de columnas espaciales reales del proyecto, vía soporte nativo de TypeORM `spatialFeatureType`/GeoJSON, sin SQL crudo), `precisionMetros`, `capturadoEn`, `clasificacion` (rural/urbana), `tipoTerritorioCatalogoItemId`, FK a `UbicacionGeografica` (nodo hoja). `coordenadas` marcada `@CampoSensible({categoria:'ubicacion-exacta'})` (primer uso de esa categoría, reservada desde Fase 0/2) — censista/líder la ven, analista no.
- [x] `libs/api/georreferenciacion/{data-access,feature}` (dominio nuevo): autocontenido, sin depender de `poblacion`/`comunidad` (restricción ya fijada en `eslint.config.mjs` desde una sesión anterior: la dependencia va `poblacion → georreferenciacion`, nunca al revés). `hogarId`/`comunidadId` en `HogarUbicacion` son columnas simples sin relación TypeORM por esa razón. `UbicacionGeograficaController` (árbol, admin-only para escritura) sí vive en este dominio; la captura de ubicación de un hogar específico NO tiene controller propio aquí — se expone desde `poblacion` (ver abajo) porque solo `HogarService` puede verificar de forma autoritativa a qué comunidad pertenece un `hogarId`.
- [x] `HogarService` extendido (`libs/api/poblacion/feature`): `registrarUbicacion`/`obtenerUbicacion` delegan en `HogarUbicacionService` (georreferenciacion) pasando siempre el `comunidadId` real del hogar ya cargado — un `comunidadId` falsificado en el body del cliente se ignora (test explícito). Endpoints `PUT`/`GET /poblacion/hogares/:id/ubicacion`.
- [x] `MapaHogaresService` (`libs/api/poblacion/feature`, nuevo): `GET /poblacion/hogares/mapa` — censista/líder/administrador ven puntos individuales con coordenadas + densidad poblacional (conteo de habitantes por hogar); analista ve agregado por nodo geográfico con `aplicarAnonimizacionKAnonimity` (sin coordenadas exactas en absoluto, no solo campo redactado — misma forma de respuesta distinta que `IndicadoresDemograficosService` en Fase 2). Soporta `?formato=csv`.
- [x] `generarCsv` consolidado en `libs/shared/util` (estaba duplicado en `api-demografia-feature` y `web-demografia-data-access` desde Fase 2; se unificó aprovechando que este módulo lo necesitaba también) — además corregido para serializar valores objeto (coordenadas GeoJSON) como JSON en vez de `"[object Object]"`.
- [x] `HogarUbicacionesSyncHandler` (`libs/api/poblacion/feature/src/lib/sync/`): mismo patrón que `HabitantesSyncHandler` — resuelve `hogarUuid → hogarId` y reintenta si el hogar aún no sincronizó.
- [x] `libs/web/georreferenciacion/{data-access,feature}`: `UbicacionesGeograficasOfflineService` (caché del árbol, mismo patrón que `CatalogoOfflineService`), `HogarUbicacionOfflineService` (Dexie outbox, referencia por `hogarUuid` igual que `HabitanteOffline`), `MapaHogaresComponent` (Leaflet — primer uso real de la dependencia ya instalada desde Fase 0 — puntos individuales o tabla agregada según la forma de la respuesta). `HogarUbicacionFormComponent` vive en `libs/web/poblacion/feature` (no en `georreferenciacion/feature`): necesita `HogaresOfflineService` para resolver `comunidadId`, y `domain:georreferenciacion` no puede depender de `domain:poblacion` (mismo motivo que en el backend).
- [x] `AppDatabase` → `version(3)`: tablas `hogarUbicaciones` y `ubicacionesGeograficasCache`.
- [x] Seed de ejemplo (`database/seeders/seed-ubicaciones-geograficas-ejemplo.ts`, no es una migración porque depende de `catalogo_items` ya sembrados): árbol representativo Colombia → Cauca/La Guajira → municipios → resguardos/veredas.
- [x] Tests: árbol de `UbicacionGeograficaService`, `HogarUbicacionService.upsert` (incluye rechazo si el hogar ya tiene ubicación bajo otra comunidad), `HogarService.registrarUbicacion` (comunidadId autoritativo, no el del DTO), `MapaHogaresService` (individual vs. agregado por rol, supresión k-anonimity, filtra hogares dados de baja), `HogarUbicacionesSyncHandler`, cascada de selects de jerarquía geográfica y guardado offline del formulario, `generarCsv` con valores objeto — 30 tests nuevos (18 backend + 7 frontend + 5 en `shared-util` incluyendo el fix de CSV... ver conteo exacto en el historial de tareas de la sesión).
- [x] Verificado end-to-end contra Postgres real: migraciones + seed corridos, árbol geográfico consultado (`Colombia → Cauca/La Guajira`), hogar creado y ubicación GPS registrada (coordenadas GeoJSON correctas), censista/líder ven `coordenadas` en `GET .../ubicacion` y analista recibe 403 (rol no permitido en ese endpoint individual), `GET /poblacion/hogares/mapa` devuelve puntos individuales para censista y agregado con `suprimido:true` (1 hogar < umbral 5) para analista, exportación CSV con coordenadas serializadas correctamente; `nx run-many -t build test lint eslint:lint --all` en verde para 30 proyectos.

### Rutas creadas en Fase 3

```
libs/api/georreferenciacion/data-access/     libs/api/georreferenciacion/feature/
libs/web/georreferenciacion/data-access/     libs/web/georreferenciacion/feature/

database/migrations/1751800000000-CreateUbicacionesGeograficasTable.ts
database/migrations/1751800060000-CreateHogarUbicacionesTable.ts
database/seeders/seed-ubicaciones-geograficas-ejemplo.ts
```

Extensiones a libs de Fases 0-2 (no regenerar, ya tienen lógica): `libs/shared/data-access` (`ClasificacionUbicacion`), `libs/shared/util` (`csv.ts`, movido/consolidado aquí), `libs/api/poblacion/feature` (`HogarService.registrarUbicacion/obtenerUbicacion`, `MapaHogaresService`, `HogarUbicacionesSyncHandler`, `HogarController` extendido con `/mapa` y `/:id/ubicacion`), `libs/web/poblacion/feature` (`HogarUbicacionFormComponent`, nuevo), `libs/web/shared/data-access` (`AppDatabase` versión 3: tablas `hogarUbicaciones`/`ubicacionesGeograficasCache`), `apps/frontend/project.json` (estilos de `leaflet` agregados, budget de bundle inicial subido a 700kb).

**Nota de diseño (resuelta en Fase 7)**: `domain:migracion` sí consume `UbicacionGeografica` (georreferenciacion) directamente para origen/destino de cada movimiento migratorio, ya que `domain:migracion` tiene permitido depender de `domain:georreferenciacion` en `eslint.config.mjs`. Sin embargo, el reporte de flujos migratorios **no** terminó siendo un mapa real con flechas: `UbicacionGeografica` es un árbol administrativo sin coordenadas/geometría, así que no hay de dónde sacar las coordenadas de origen/destino — se implementó como tabla agrupada origen→destino en su lugar (ver Fase 7).

## Fase 4 — Vivienda (MOD-04) — **COMPLETADA**

- [x] `Vivienda` (`viviendas`) y `VivendaServicio` (`vivienda_servicios`, una fila por `(viviendaId, tipoServicioCatalogoItemId)` en vez de columnas planas repetidas). `hogares.vivienda_id` como columna simple (sin `@ManyToOne`, evita que `poblacion-data-access` dependa de `vivienda-data-access`); la asignación real vive en `HogarService.asignarVivienda` (mismo patrón que `actualizarJefeHogar`).
- [x] `libs/api/vivienda/{data-access,feature}` (dominio nuevo): a diferencia de Fase 3, aquí `eslint.config.mjs` ya permitía `domain:vivienda → domain:poblacion` desde antes, así que **todo el HTTP vive en `vivienda/feature`** (`ViviendaController`), que inyecta `HogarService` (exportado por `ApiPoblacionFeatureModule`) para verificar acceso — sin necesidad de la inversión de dependencias que sí hizo falta en georreferenciación.
- [x] **Hacinamiento y NBI calculados en vivo, sin vistas materializadas** (desviación deliberada del roadmap original, que sugería `mv_hacinamiento_hogar`/`mv_nbi_hogar`): RF-04-01 exige que el hacinamiento se calcule "automáticamente", lo que una vista materializada dejaría desactualizado tras cada alta/baja de habitante sin un `REFRESH` manual — mismo criterio que ya distinguió pirámide (viva) de indicadores (cierre de periodo) en Fase 2, pero aquí ambos son por-hogar, no un artefacto de cierre. `HacinamientoNbiService` reutiliza `calcularHacinamiento` (existía sin consumidores desde Fase 0/1).
- [x] **NBI simplificado**: de los 5 componentes clásicos DANE solo 3 son calculables con los módulos ya construidos — vivienda inadecuada (tipo/material), hacinamiento crítico (>3 habitantes/dormitorio), servicios inadecuados (agua/saneamiento). Los otros dos (dependencia económica, inasistencia escolar) quedan para cuando existan Fases 5/6 — documentado explícitamente como parcial, no simulado.
- [x] `CoberturaServiciosService` (RF-04-03): % de viviendas con cada servicio en `'sí'`, agrupado por comunidad+periodo, con supresión k-anonimity (`aplicarAnonimizacionKAnonimity`) y exportación CSV — también en vivo, sin vista materializada (no hay condición de "solo periodos cerrados" que la justifique).
- [x] Nuevos catálogos seeded: `tipo_servicio_vivienda`, `manejo_residuos`, `tipo_conectividad` (agua/saneamiento/energía ya tenían catálogo de fuente desde Fase 0).
- [x] `libs/web/vivienda/{data-access,feature}`: `ViviendaOfflineService` (outbox por `hogarUuid`, mismo patrón que `HogarUbicacionOfflineService`), `ViviendaFormComponent` (hacinamiento en vivo contra habitantes ya capturados localmente del hogar, FormArray dinámico de servicios con su catálogo de "fuente" correspondiente), `CoberturaServiciosComponent` (reporte online-only con export CSV).
- [x] `AppDatabase` → `version(4)`: tabla `viviendas`.
- [x] Tests: `ViviendaService` (transacción + asignación, rechazo de vivienda duplicada), `HacinamientoNbiService` (cada componente de NBI por separado), `CoberturaServiciosService` (porcentajes, supresión, sin-hogares≠0/0), `HogarService.asignarVivienda`, `ViviendaSyncHandler`, formulario con hacinamiento en vivo — 22 tests nuevos backend + 5 frontend.
- [x] **Bug real encontrado y corregido durante la verificación end-to-end** (no en tests unitarios, que mockean `dataSource.transaction`): `ViviendaService.crearParaHogar` llamaba `HogarService.asignarVivienda` **dentro** de la transacción que creaba la `Vivienda` — `HogarService` usa su propio repositorio (conexión distinta a la del `manager` transaccional), así que intentaba fijar `hogares.vivienda_id` contra una fila aún no comprometida (COMMIT), violando la FK por aislamiento de transacción. Corregido moviendo `asignarVivienda` fuera de la transacción, después de que el `await this.dataSource.transaction(...)` resuelve. **Lección para dominios futuros**: cualquier llamada a un servicio de OTRO dominio que dependa de una fila recién creada debe ir después de que su transacción haya comprometido, nunca dentro del callback de `manager.transaction`.
- [x] Verificado end-to-end contra Postgres real: hogar + vivienda con materiales/servicios adecuados (NBI falso), 7 habitantes con 2 dormitorios → hacinamiento 3.5 (crítico, NBI verdadero), reporte de cobertura suprimido por k-anonimity (1 vivienda < umbral 5) y con CSV correcto, rechazo (403) de una segunda vivienda para el mismo hogar; `nx run-many -t build test lint eslint:lint --all` en verde para 34 proyectos.

### Rutas creadas en Fase 4

```
libs/api/vivienda/data-access/     libs/api/vivienda/feature/
libs/web/vivienda/data-access/      libs/web/vivienda/feature/

database/migrations/1751900000000-CreateViviendasTable.ts
database/migrations/1751900060000-CreateViviendaServiciosTable.ts
database/migrations/1751900120000-AlterHogaresAddViviendaId.ts
```

Extensiones a libs de Fases 0-3 (no regenerar, ya tienen lógica): `libs/shared/data-access` (`EstadoServicio`), `libs/api/poblacion/data-access` (`Hogar.viviendaId`), `libs/api/poblacion/feature` (`HogarService.asignarVivienda`), `database/seeders/seed-catalogos-base.ts` (3 catálogos nuevos).

## Fase 5 — Educación (MOD-05) — **COMPLETADA**

- [x] `HabitanteEducacion` (`habitante_educaciones`, 1:1 con habitante) y `HabitanteLengua` (`habitante_lenguas`, N filas por habitante, incluye marca `esLenguaMaterna`). A diferencia de `HogarUbicacion`/`Vivienda` (Fase 3/4), aquí la relación con `Habitante` es **real** (`@ManyToOne`), no una columna simple: `domain:educacion` ya podía depender de `domain:poblacion` desde el `eslint.config.mjs` heredado, y no hace falta ningún puntero hacia adelante en `Habitante` (a diferencia de `hogares.vivienda_id`) porque `EducacionService` siempre consulta directo por `habitanteId`.
- [x] `libs/api/educacion/{data-access,feature}` (dominio nuevo): mismo patrón que Fase 4 (`vivienda`) — todo el HTTP vive en `educacion/feature` (`EducacionController`), inyectando `HabitanteService` (exportado por `ApiPoblacionFeatureModule`) para verificar acceso.
- [x] Catálogos ya seeded desde Fase 0 sin usar hasta ahora: `lengua`, `nivel_educativo` — reutilizados sin cambios.
- [x] `IndicadoresEducativosService` (RF-05-02): tasa de alfabetismo, tasa de asistencia escolar y distribución por nivel educativo — **en vivo** (mismo criterio que hacinamiento/NBI y cobertura de servicios en Fase 4), filtrable por `sexo`/`grupoQuinquenal` (reutiliza `calcularEdad`/`calcularGrupoQuinquenal` de Fase 2). Aplica `aplicarAnonimizacionKAnonimity` a la distribución por nivel.
- [x] `EducacionSyncHandler`: mismo patrón que `ViviendaSyncHandler`, resuelve `habitanteUuid → habitanteId`.
- [x] `libs/web/educacion/{data-access,feature}`: `EducacionOfflineService` (outbox por `habitanteUuid`), `EducacionFormComponent` (checkbox alfabetizado/asiste escuela, select nivel educativo, lista dinámica de lenguas con "agregar"/"quitar" — los controles de lengua individuales **no** llevan `Validators.required`, las filas sin lengua seleccionada simplemente se descartan al guardar, para no bloquear el envío del formulario mientras el censista agrega filas), `IndicadoresEducativosComponent` (dashboard online con filtro de sexo, export CSV).
- [x] `AppDatabase` → `version(5)`: tabla `habitanteEducaciones` (con `lenguas` embebidas como array, mismo criterio que `servicios` en `ViviendaOffline`).
- [x] Tests: `EducacionService` (transacción + rechazo de registro duplicado + reemplazo de lenguas), `IndicadoresEducativosService` (tasas, distribución con supresión k-anonimity, filtro por sexo — verificado contra los argumentos reales de la consulta, no solo el resultado, para no enmascarar un filtrado que en el mock no se aplica solo), `EducacionSyncHandler`, formulario (alta/baja dinámica de filas de lengua, guardado offline) — 17 tests nuevos backend + 4 frontend.
- [x] **Segundo bug real encontrado en la verificación end-to-end** (no en tests unitarios, que mockean los repositorios): `database/data-source.ts` (el `DataSource` standalone que usa el CLI de migraciones, separado del `TypeOrmModule` en runtime) nunca había registrado las entidades `Habitante`/`Hogar` — no hacía falta hasta ahora porque `HogarUbicacion`/`Vivienda` (Fase 3/4) usaban columnas simples en vez de relaciones reales hacia ellas. Al añadir `HabitanteEducacion.habitante` (`@ManyToOne(() => Habitante)`), `migration:run` falló con `Entity metadata for HabitanteEducacion#habitante was not found` porque TypeORM no podía resolver la metadata de la entidad relacionada. Corregido agregando `Hogar` y `Habitante` a `AppDataSource.entities`. **Lección para dominios futuros**: cualquier entidad nueva con una relación `@ManyToOne`/`@OneToMany` real hacia una entidad de otro dominio (a diferencia de una columna simple) requiere que ESA entidad relacionada también esté en `database/data-source.ts`, no solo en el `TypeOrmModule` en runtime (que la resuelve solo vía `autoLoadEntities` + los `forFeature()` de cada módulo, un mecanismo distinto).
- [x] Verificado end-to-end contra Postgres real: habitante + educación (alfabetizado, nivel básica primaria, 2 lenguas incluida materna), tasa de alfabetismo 100%/asistencia 0%, distribución suprimida por k-anonimity (1 < umbral 5), reemplazo completo de lenguas, rechazo (403) de un segundo registro de educación para el mismo habitante; `nx run-many -t build test lint eslint:lint --all` en verde para 38 proyectos.

### Rutas creadas en Fase 5

```
libs/api/educacion/data-access/     libs/api/educacion/feature/
libs/web/educacion/data-access/      libs/web/educacion/feature/

database/migrations/1751900180000-CreateHabitanteEducacionesTable.ts
database/migrations/1751900240000-CreateHabitanteLenguasTable.ts
```

Extensiones a libs de Fases 0-4 (no regenerar, ya tienen lógica): `database/data-source.ts` (`Hogar`/`Habitante` agregados a `entities`, ver bug arriba).

## Fase 6 — Economía (MOD-06) — **COMPLETADA**

- [x] **Hallazgo de diseño**: el catálogo `ocupacion` (seeded desde Fase 0) mezclaba dos dimensiones que RF-06-01 trata por separado — "condición de actividad" (`desempleado`/`estudiante`/`labores_hogar`) y "tipo de ocupación" (`agricultura_subsistencia`/`artesania`/`pesca`/`jornalero`/`empleado_formal`/`comercio_informal`/`otro`). Se creó el catálogo nuevo `condicion_actividad` (`ocupado`/`desempleado`/`inactivo`/`estudiante`/`labores_hogar`) y se depuró `ocupacion` (quitando los 3 ítems que se mudaron) — mismo criterio de reinterpretación de catálogos ya aplicado en Fases 3/4.
- [x] `HabitanteOcupacion` (`habitante_ocupaciones`, 1:1 con habitante, relación real igual que `HabitanteEducacion` en Fase 5): `condicionActividadCatalogoItemId` (requerido), `ocupacionCatalogoItemId` (nullable, solo aplica si condición = `ocupado`), `ingresoMensual` (`numeric(12,2)`, nullable). **Primer uso real de la categoría `ingresos`** en `@CampoSensible` (reservada desde Fase 0, sin consumidores hasta ahora) — mismo patrón de `rolesPermitidos` que `numeroDocumento`.
- [x] `libs/api/economia/{data-access,feature}` (dominio nuevo, mismo patrón arquitectónico que `vivienda`/`educacion`): todo el HTTP vive en `economia/feature` inyectando `HabitanteService`.
- [x] `IndicadoresEconomicosService` (RF-06-02): tasa de desempleo = desempleados / PEA (PEA = ocupados + desempleados, definición configurable documentada como valor por defecto) y distribución ocupacional (agrupada por tipo de ocupación entre los `ocupado`) — en vivo, filtrable por sexo/grupo de edad, con `aplicarAnonimizacionKAnonimity`.
- [x] `EconomiaSyncHandler`: mismo patrón que `EducacionSyncHandler`.
- [x] `libs/web/economia/{data-access,feature}`: `EconomiaOfflineService` (outbox por `habitanteUuid`), `EconomiaFormComponent` (el select de tipo de ocupación solo se muestra/habilita si la condición de actividad seleccionada es `ocupado` — se limpia automáticamente si el censista cambia de condición después de haberlo llenado), `IndicadoresEconomicosComponent` (dashboard con filtro de sexo, export CSV).
- [x] `AppDatabase` → `version(6)`: tabla `habitanteOcupaciones`.
- [x] **Nota operativa de esta sesión**: el Bash tool tuvo una interrupción intermitente del clasificador de seguridad durante gran parte de esta fase; todas las libs nuevas (`libs/api/economia/*`, `libs/web/economia/*` con toda su configuración de `project.json`/`tsconfig*`/`jest.config.cts`) se crearon **a mano con la herramienta `Write`**, replicando exactamente la estructura de `libs/api/educacion/*`/`libs/web/educacion/*` en vez de usar los generadores de Nx — funcionó sin errores de compilación a la primera vez que Bash volvió a estar disponible, lo cual confirma que documentar la plantilla exacta (Fase 3/4) fue suficiente para reproducirla manualmente sin depender del generador.
- [x] Tests: `EconomiaService` (creación con `ingresoMensual` serializado a string para la columna `numeric`, rechazo de duplicado), `IndicadoresEconomicosService` (tasa de desempleo sobre la PEA, distribución con supresión k-anonimity, caso sin nadie en la PEA → `null`), `EconomiaSyncHandler`, formulario (ocultar/mostrar tipo de ocupación según condición) — 15 tests nuevos backend + 4 frontend.
- [x] Verificado end-to-end contra Postgres real: habitante con ocupación (condición=ocupado, tipo=artesanía, ingreso mensual), censista ve `ingresoMensual`, analista no puede ni siquiera acceder al endpoint individual (403, mismo patrón que Fases 3-5), tasa de desempleo y distribución (suprimida por tamaño de muestra) correctas, rechazo de registro de ocupación duplicado; `nx run-many -t build test lint eslint:lint --all` en verde para 42 proyectos.

### Rutas creadas en Fase 6

```
libs/api/economia/data-access/     libs/api/economia/feature/
libs/web/economia/data-access/      libs/web/economia/feature/

database/migrations/1751900300000-CreateHabitanteOcupacionesTable.ts
```

Extensiones a libs de Fases 0-5 (no regenerar, ya tienen lógica): `database/seeders/seed-catalogos-base.ts` (`condicion_actividad` nuevo, `ocupacion` depurado — si se corre el seeder sobre una base ya sembrada en sesiones anteriores, los 3 ítems viejos de `ocupacion` quedan huérfanos porque el seeder usa `ON CONFLICT DO NOTHING`; hay que borrarlos a mano si se quiere reflejar el catálogo depurado en una base de datos preexistente), `database/data-source.ts` (`HabitanteOcupacion` agregada a `entities`).

## Fase 7 — Migración (MOD-07) — **COMPLETADA**

- [x] **`domain:migracion` es el primer dominio con doble dependencia permitida**: `eslint.config.mjs` ya autorizaba `domain:migracion → domain:poblacion` **y** `domain:migracion → domain:georreferenciacion` simultáneamente (a diferencia de todas las fases anteriores, que solo tenían una de las dos). `MovimientoMigratorio` tiene relaciones `@ManyToOne` reales hacia `Habitante` y hacia `UbicacionGeografica` (Fase 3) sin ningún workaround de inversión de control.
- [x] `MovimientoMigratorio` (`movimientos_migratorios`) es una lista histórica **N por habitante** (a diferencia del patrón 1:1 de `HabitanteEducacion`/`HabitanteOcupacion` en Fases 5/6): `crearParaHabitante` siempre agrega, sin rechazo de duplicado — un habitante puede migrar varias veces. Campos: `tipoMovimiento` (`interna`/`externa`), `direccion` (`entrada`/`salida`, registrada explícitamente por el censista — no se infiere geográficamente), origen/destino con FK opcional a `UbicacionGeografica` **más** texto libre opcional (cubre migración internacional, que no tiene nodo en el árbol de Colombia sembrado en Fase 3), `fechaMovimiento`, `motivoCatalogoItemId` (catálogo `motivo_migracion`, ya sembrado desde Fase 0), `esTemporal`, `periodoCensalId` propio (RF-07-02 reporta "por comunidad y periodo", y un habitante puede migrar en cualquier periodo posterior a su alta).
- [x] `libs/api/migracion/{data-access,feature}`: `MigracionService` (crear/listar/actualizar/eliminar — eliminar es soft-delete para corrección administrativa, no para deshacer un evento histórico real), `FlujosMigratoriosService` (RF-07-02: total entradas/salidas, saldo neto, agrupado por origen→destino, filtrable por motivo — en vivo, sin vista materializada, mismo criterio que Fases 4-6) con `MigracionController` exponiendo `POST/GET /migracion/habitantes/:habitanteId`, `PATCH/DELETE /migracion/:id`, `GET /migracion/flujos` (soporta `?formato=csv`).
- [x] **Regla nueva de anonimización**: `aplicarAnonimizacionKAnonimity` se aplica tanto a los totales de entradas/salidas como a cada fila agrupada origen→destino; si entradas **o** salidas queda suprimida, `saldoNeto` se fuerza a `null` (no solo el valor suprimido) para evitar que se pueda deducir por diferencia aritmética un valor que individualmente sí estaría protegido.
- [x] **Limitación documentada de RF-07-02** ("mapa con flechas origen-destino"): `UbicacionGeografica` (Fase 3) es un árbol administrativo sin coordenadas/geometría — no hay fuente de lat/lng para origen/destino en el sistema. Se implementó el reporte como tabla agrupada origen→destino en vez de un mapa real, para no reabrir el alcance de una entidad ya cerrada en Fase 3 sin que ningún RF de esta fase lo pida explícitamente (mismo criterio que la simplificación de NBI documentada en Fase 4).
- [x] `MigracionSyncHandler`: cada operación de sync es un evento nuevo (no hay "ya existe" que resolver, a diferencia de Fases 5/6), rechaza `eliminar` vía sync.
- [x] `libs/web/migracion/{data-access,feature}`: `MigracionOfflineService` con `listarPorHabitante` (cada evento tiene **su propio uuid**, no reutiliza el uuid del habitante como sí hacían `EducacionOfflineService`/`EconomiaOfflineService` en el patrón 1:1 — `OfflineRepository` no tiene consulta filtrada por índice, así que se filtra en memoria sobre `listar()`, mismo patrón usado para filtrar por `hogarUuid` en Fase 5). `MigracionFormComponent`: a diferencia de los formularios 1:1 de educación/economía, `guardar()` no navega fuera de la pantalla — resetea el formulario y muestra un contador de "eventos capturados", permitiendo registrar varios movimientos migratorios seguidos para el mismo habitante. `FlujosMigratoriosComponent`: dashboard online con filtros de comunidad/periodo/motivo y export CSV, mismo patrón que `CoberturaServiciosComponent`/`IndicadoresEconomicosComponent`.
- [x] `AppDatabase` → `version(7)`: tabla `movimientosMigratorios` (clave primaria `uuid` propia del evento, campo `habitanteUuid` de referencia).
- [x] Tests: backend `MigracionService` (creación múltiple sin rechazo, listar por habitante), `FlujosMigratoriosService` (saldo neto, filtro por motivo, supresión k-anonimity incluyendo el caso "solo uno de los dos lados suprimido" → saldo `null`), `MigracionSyncHandler` — 12 tests. Frontend `MigracionFormComponent` (contador de eventos, uuid propio por evento, formulario no navega y permite capturar un segundo evento) — 4 tests.
- [x] Verificado end-to-end contra Postgres real: habitante con dos eventos migratorios (salida interna Cauca→Popayán, entrada externa Venezuela→Cauca con texto libre) — ambos coexisten sin rechazo de duplicado (confirma el patrón N-por-habitante); `GET /migracion/flujos` sin filtro muestra supresión k-anonimity (comunidad de prueba con muy pocos habitantes); filtro por motivo aísla correctamente el evento correspondiente; export CSV con celdas suprimidas en blanco; `PATCH`/`DELETE` (soft-delete, verificado que la fila persiste con `deleted_at` y desaparece de los listados). `nx run-many -t build test lint eslint:lint --all` en verde para 46 proyectos / 113 tareas.

### Rutas creadas en Fase 7

```
libs/api/migracion/data-access/     libs/api/migracion/feature/
libs/web/migracion/data-access/      libs/web/migracion/feature/

database/migrations/1751900360000-CreateMovimientosMigratoriosTable.ts
```

Extensiones a libs de Fases 0-6 (no regenerar, ya tienen lógica): `libs/shared/data-access` (`TipoMovimientoMigratorio`, `DireccionMigratoria`), `database/data-source.ts` (`MovimientoMigratorio` agregada a `entities`), `apps/frontend/src/app/app.routes.ts` (`poblacion/habitantes/:habitanteUuid/migracion`, `migracion/flujos`), `apps/frontend/public/i18n/es-CO.json` (namespace `migracion.*`).

## Fase 8 — Etnia/Vulnerabilidad (MOD-08) — **COMPLETADA**

- [x] **Sin entidad `etnias` dedicada**: a diferencia de lo previsto originalmente en este documento, "pueblo/etnia" y "condición de vulnerabilidad" se implementaron como catálogos genéricos nuevos (`etnia`, 14 pueblos indígenas de Colombia; `condicion_vulnerabilidad`, ya sembrado desde una fase anterior con los tipos de discapacidad ya desagregados como ítems planos) en vez de tablas propias — mismo criterio que `lengua`/`parentesco`/`motivo_migracion`: son listas planas administrables vía `/catalogos` (RT-02, exclusivo del rol Administrador), no árboles grandes que justifiquen una entidad dedicada como `UbicacionGeografica` (Fase 3).
- [x] **`domain:etnia-vulnerabilidad` NO puede depender de `domain:georreferenciacion`** (a diferencia de `domain:migracion` en Fase 7, que sí podía): `HabitanteEtnia.resguardoUbicacionGeograficaId` (RF-08-01, "resguardo o territorio asociado") es una columna simple sin relación TypeORM, con integridad referencial real solo a nivel de FK en la migración — mismo patrón que `HogarUbicacion.hogarId` en Fase 3, con los roles de dependencia invertidos. En el frontend, el mismo límite de dominio aplica: el selector de resguardo pide `/api/georreferenciacion/ubicaciones-geograficas` por HTTP directo en vez de reutilizar `UbicacionesGeograficasOfflineService` (que sí importa la lib de georreferenciación).
- [x] `HabitanteEtnia` (`habitante_etnias`, 1:1 con habitante, mismo patrón que `HabitanteEducacion` en Fase 5): `etniaCatalogoItemId`, `lenguaMaternaCatalogoItemId` (nullable, reutiliza el catálogo `lengua` de Fase 5), `resguardoUbicacionGeograficaId` (nullable). **Primer uso real de las categorías `etnia` y `salud` en `@CampoSensible`** (reservadas desde Fase 0, sin consumidores hasta ahora) — mismo `rolesPermitidos: [CENSISTA, LIDER_COMUNITARIO]` que las demás categorías sensibles.
- [x] `HabitanteCondicionVulnerabilidad` (`habitante_condiciones_vulnerabilidad`, N por habitante con restricción única por par habitante+condición, mismo patrón de reemplazo completo que `HabitanteLengua` en Fase 5 — a diferencia de `MovimientoMigratorio`, Fase 7, que sí acepta eventos repetidos en el tiempo): registrar la misma condición dos veces no aporta información nueva, así que se deduplica antes de insertar y se administra por `PUT .../condiciones-vulnerabilidad` (borra e inserta), no por acumulación.
- [x] `libs/api/etnia-vulnerabilidad/{data-access,feature}` (dominio nuevo, mismo patrón arquitectónico que `educacion`): todo el HTTP vive en `etnia-vulnerabilidad/feature` inyectando `HabitanteService`.
- [x] `CaracterizacionEtnicaService` (RF-08-03): conteos por etnia y por condición de vulnerabilidad, en vivo, con `aplicarAnonimizacionKAnonimity` por grupo. **`comunidadId` es opcional en el DTO del reporte** — si se omite, `HabitanteService.listar` ya agrega todas las comunidades permitidas para el usuario (o todas las existentes si su asignación es global), lo que cubre "consolidado nacional" (RF-08-03) sin necesitar ningún concepto de "región" propio.
- [x] **Alcance no implementado, documentado y consistente con fases anteriores**: "región" como dimensión de reporte (mencionada también en RF-01-04 y RF-04-03, nunca implementada en Fases 1/4) sigue sin implementarse aquí — `Comunidad` no tiene columna de región y no se agregó una. El "consolidado nacional" de RF-08-03 se resuelve con comunidades individuales agregadas (arriba), no con una jerarquía de región real.
- [x] `EtniaVulnerabilidadSyncHandler`: mismo patrón que `EducacionSyncHandler` (dominio `'etnias-vulnerabilidad'`, payload con `habitanteUuid`, siempre `crear` — el reemplazo de condiciones no viaja por sync en esta fase, solo la creación inicial con el conjunto completo).
- [x] `libs/web/etnia-vulnerabilidad/{data-access,feature}`: `EtniaVulnerabilidadOfflineService` (reutiliza el uuid del habitante, 1:1), `EtniaVulnerabilidadFormComponent` (etnia + lengua materna + resguardo, más una lista de checkboxes de condiciones de vulnerabilidad respaldada por un `Set<number>` en vez de un `FormArray`, más simple porque el catálogo es fijo y no hay filas dinámicas que agregar/quitar), `CaracterizacionEtnicaComponent` (dashboard con selector de comunidad que incluye una opción "consolidado nacional" con valor vacío, filtro de periodo, dos tablas de conteo, export CSV combinado con columna `tipo`).
- [x] `AppDatabase` → `version(8)`: tabla `habitanteEtnias`.
- [x] Wiring de UX (continuando el patrón establecido tras la sesión de estilización general): tarjeta en home, enlace rápido por habitante en el listado, y botón en el banner de retroalimentación de `HabitanteFormComponent` ("Registrar identificación étnica y vulnerabilidad") junto a los de educación/economía/migración.
- [x] Tests: `EtniaVulnerabilidadService` (creación con deduplicación de condiciones repetidas, rechazo de registro duplicado, reemplazo completo de condiciones), `CaracterizacionEtnicaService` (paso de `comunidadId`/`periodoCensalId` a `HabitanteService.listar`, comportamiento con `comunidadId` omitido, supresión k-anonimity por grupo, caso sin habitantes), `EtniaVulnerabilidadSyncHandler` — 14 tests backend + 4 frontend (formulario: validación, alternar condiciones, guardado con uuid del habitante, precarga de un registro existente).
- [x] Verificado end-to-end contra Postgres real: 6 habitantes (5 con etnia "Nasa" + condición "Discapacidad física", 1 con etnia "Wayuu" + condición "Víctima de conflicto armado" + resguardo asociado) — reporte agrupado muestra Nasa/Discapacidad física sin suprimir (5, justo en el umbral) y Wayuu/Víctima de conflicto armado suprimidos (1, bajo el umbral); consolidado nacional (sin `comunidadId`) devuelve el mismo resultado para un usuario cuyo único acceso es esa comunidad (correcto: el "consolidado" de un usuario no-global es lo que él puede ver, no todo el sistema); CSV combinado con columna `tipo`; `PATCH`/`PUT condiciones-vulnerabilidad` (reemplazo completo verificado); rol ANALISTA bloqueado (403) en el endpoint individual pero con acceso (200) al reporte agregado. `nx run-many -t build test lint eslint:lint --all` en verde para 50 proyectos / 123 tareas.

### Rutas creadas en Fase 8

```
libs/api/etnia-vulnerabilidad/data-access/     libs/api/etnia-vulnerabilidad/feature/
libs/web/etnia-vulnerabilidad/data-access/      libs/web/etnia-vulnerabilidad/feature/

database/migrations/1751900420000-CreateHabitanteEtniasAndCondicionesVulnerabilidadTables.ts
```

Extensiones a libs de Fases 0-7 (no regenerar, ya tienen lógica): `database/seeders/seed-catalogos-base.ts` (catálogo `etnia` nuevo, 14 pueblos indígenas), `database/data-source.ts` (`HabitanteEtnia`/`HabitanteCondicionVulnerabilidad` agregadas a `entities`), `apps/frontend/src/app/app.routes.ts` (`poblacion/habitantes/:habitanteUuid/etnia-vulnerabilidad`, `etnia-vulnerabilidad/caracterizacion`), `apps/frontend/public/i18n/es-CO.json` (namespace `etniaVulnerabilidad.*`), `home-page.component.ts` (tarjeta nueva), `habitantes-list.component.html` (enlace rápido), `habitante-form.component.html`/`.ts` (botón nuevo en el banner de retroalimentación).

## Fase 9 — Recursos (MOD-09) — **PENDIENTE**

- [ ] Entidad `presupuestos`
- [ ] Vista `mv_indicadores_agregados_comunidad`
- [ ] Panel ordenable/comparativo entre comunidades (analista con alcance global)

## Fase 10 — Periodos/Reportes comparativos (MOD-10) — **PENDIENTE**

- [ ] Completar `PeriodoCensalService` (`cerrarPeriodo`, `iniciarNuevoPeriodo`)
- [ ] Entidad `notificaciones`
- [ ] Comparación histórica en series de tiempo

## Fase 11 - Panel de administración global de comunidades

- [ ] Crear una nueva lib para el administrador de comunidades, para poder ver todas las comunidades, sus estados, y poder administrarlas.  
- [ ] los usuarios que podran acceder a este panel de administracion son los que tengan el rol de admin.
- [ ] El rol administrador puede acceder a todas las comunidades, todos los periodos censales y todas las funcionalidades del sistema.
- [ ] Los usuarios con rol censista, capturador, revisor o analista no tienen acceso al panel de administración global de comunidades.

---

## Notas para evitar sobre-escritura

- No volver a correr generadores Nx (`nx g @nx/nest:library`, `nx g @nx/angular:library`, `nx g @nx/js:library`) sobre ninguna de las libs listadas como ya creadas en Fases 0-6 — ya existen y tienen lógica implementada, un generador podría sobrescribir archivos. Si se crea una lib nueva para `libs/web/<dominio>` con contenido Angular (componentes, `HttpClient`), el flujo que funciona en este repo es: generar con `@nx/js:library --bundler=none`, luego **copiar** `tsconfig.json`/`tsconfig.lib.json`/`tsconfig.spec.json`/`jest.config.cts`/`src/test-setup.ts` desde una lib Angular ya corregida (p.ej. `libs/web/economia/{data-access,feature}` o `libs/web/educacion/{data-access,feature}`) y solo renombrar el `displayName`/`coverageDirectory` — el `@nx/js:library` puro genera un tsconfig sin `moduleResolution: bundler`/`angularCompilerOptions`, lo que rompe la resolución de `@angular/common/http`. Además: (1) agregar manualmente el target `build` (`@nx/js:tsc`) al `project.json` si otra lib la va a importar — el generador con `bundler=none` no lo agrega; (2) cualquier `web-*-data-access` que otra lib `feature` importe necesita su propio `package.json` (mismo formato que `libs/web/demografia/data-access/package.json`) para que `@nx/js:tsc` la resuelva como "librería buildable" en vez de fallar con `TS6059` (rootDir); (3) el generador dado (tanto `@nx/nest:library` como `@nx/js:library`) a veces escribe el path de `tsconfig.base.json` **sin el prefijo `@censo/`** — revisar y corregir siempre después de generar. **Si el generador de Nx no está disponible** (p.ej. el Bash tool bloqueado), toda la estructura de una lib (`project.json`, `tsconfig*.json`, `jest.config.cts`, `eslint.config.mjs`, `src/test-setup.ts`, `package.json` si aplica) se puede escribir a mano copiando el contenido exacto de una lib hermana ya existente del mismo tipo (api data-access/feature o web data-access/feature) — así se hizo en Fase 6 con `libs/api/economia/*` y `libs/web/economia/*`, y compiló/pasó lint a la primera sin necesitar el generador en ningún momento.
- Las migraciones son secuenciales por timestamp; la próxima migración debe numerarse después de `1751900300000` (revisar `database/migrations/` antes de crear una nueva para no chocar con el orden).
- **`database/data-source.ts`** (el `DataSource` standalone usado por el CLI de migraciones, separado del `TypeOrmModule` en runtime) debe incluir en su array `entities` no solo las entidades de la lib nueva, sino **cualquier entidad de OTRO dominio que esas entidades referencien con una relación real** (`@ManyToOne`/`@OneToOne`/`@OneToMany`, no una columna simple) — si no, `migration:run` falla con `Entity metadata for X#relacion was not found`. El `TypeOrmModule` en runtime no tiene este problema (usa `autoLoadEntities` + los `forFeature()` de cada módulo), así que este error solo aparece al correr migraciones, nunca al levantar el servidor — no asumir que "el build/servidor funcionó" significa que las migraciones también van a correr bien.
- Antes de crear una lib nueva para un dominio de negocio (Fases 9-10), revisar este archivo y el árbol real de `libs/api/<dominio>` / `libs/web/<dominio>` por si ya quedó un `data-access`/`feature` parcialmente creado en una sesión anterior.
- `libs/api/poblacion`, `libs/web/poblacion`, `libs/api/demografia`, `libs/web/demografia`, `libs/api/georreferenciacion`, `libs/web/georreferenciacion`, `libs/api/vivienda`, `libs/web/vivienda`, `libs/api/educacion`, `libs/web/educacion`, `libs/api/economia`, `libs/web/economia`, `libs/api/migracion`, `libs/web/migracion`, `libs/api/etnia-vulnerabilidad` y `libs/web/etnia-vulnerabilidad` ya existen con lógica completa — Fase 9 (Recursos) y posteriores deben extenderlas (nuevas entidades/columnas) cuando corresponda, no regenerarlas.
- **Las libs `libs/api/<dominio>/data-access` NO deben tener target `build`** (solo `test`): a diferencia de las libs `web-*-data-access`, que sí necesitan `build` con `@nx/js:tsc` para que otras libs web las consuman como "buildable", el generador `@nx/nest:library --buildable` le agrega un target `build` que **falla con TS6059** (rootDir) en cuanto la entidad importa otra entidad de otro dominio (p.ej. `Habitante`) — ninguna lib `api/*/data-access` existente (`educacion`, `economia`, `migracion`) tiene ese target, porque `apps/api` se compila entero con webpack (no depende de que cada lib sea buildable individualmente). Detectado en Fase 8 al generar `api-etnia-vulnerabilidad-data-access` con `--buildable`: hubo que quitar el target `build` y el `package.json` del `project.json`, dejando solo `test`, igual que sus hermanas.
- `libs/api/shared/util` **ya no existe** (se eliminó en Fase 2 por quedar vacío): la utilidad de anonimización k-anonimity y `generarCsv` viven en `libs/shared/util` (cross-runtime).
- `PeriodoCierreHookRegistry` (`libs/api/shared/feature`) es el patrón a seguir para "engancharse" al cierre de un periodo censal desde cualquier dominio nuevo, sin que `domain:periodo-censal` dependa de ese dominio (mismo espíritu que `SyncHandlerRegistry`). **Ojo**: no todos los indicadores por-hogar necesitan ese patrón — hacinamiento/NBI (Fase 4) y la pirámide poblacional (Fase 2) se calculan en vivo porque no son artefactos de cierre de periodo; usar `PeriodoCierreHookRegistry` solo cuando el requerimiento explícitamente dice "se recalcula al cerrar" (como los indicadores demográficos agregados).
- Antes de dar por buena la dirección de dependencia entre dos dominios nuevos, revisar `eslint.config.mjs`: varias reglas ya vienen predefinidas desde una sesión anterior (p.ej. `poblacion → georreferenciacion`/`vivienda`, `migracion → georreferenciacion`) y fijan de antemano en qué lib debe vivir la orquestación entre dominios (siempre en el lado que SÍ puede importar al otro, nunca al revés). `vivienda → poblacion` SÍ está permitido (a diferencia de `georreferenciacion → poblacion`, que no lo está): por eso Fase 4 pudo poner el controller HTTP completo en `vivienda/feature` inyectando `HogarService`, mientras que Fase 3 tuvo que invertir la orquestación hacia `poblacion/feature`. Revisar primero cuál de los dos patrones aplica antes de diseñar un dominio nuevo.
- `catalogo_items` (genérico, administrable) no es el lugar para datos jerárquicos reales potencialmente numerosos (municipios, veredas): úsalo para catálogos planos o de pocas decenas de nodos; para árboles grandes, crea una entidad dedicada (como `UbicacionGeografica`) que solo referencie un catálogo plano para clasificar el "nivel/tipo" de cada nodo.
- **Nunca llamar a un servicio de otro dominio que dependa de una fila recién creada DENTRO del callback de `dataSource.transaction(...)`** si ese servicio usa su propio repositorio inyectado (conexión distinta al `manager` transaccional): la fila no es visible fuera de la transacción hasta el COMMIT, y la llamada fallará por violación de FK (aislamiento de transacción). Ver el bug real encontrado en `ViviendaService.crearParaHogar` (Fase 4) — la llamada a `HogarService.asignarVivienda` se movió fuera de la transacción.
- Actualizar este documento (marcar checklist y mover el estado a `COMPLETADA`, agregar rutas creadas) al cerrar cada fase, no solo al final del proyecto.
