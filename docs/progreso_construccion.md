# Progreso de construcción — Censo Poblacional Indígena Multi-Comunidad

Última actualización: 2026-07-06 (Fase 3 completada)

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

**Nota de diseño para Fases futuras**: si Fase 7 (Migración) necesita reutilizar el mapa para visualizar flujos origen/destino, puede consumir `UbicacionesGeograficasService`/`UbicacionGeografica` (georreferenciacion) directamente ya que `domain:migracion` sí tiene permitido depender de `domain:georreferenciacion` en `eslint.config.mjs`; no necesita pasar por `poblacion`.

## Fase 4 — Vivienda (MOD-04) — **PENDIENTE**

- [ ] Entidades: `viviendas`, `hogares.vivienda_id`, `vivienda_servicios`
- [ ] Vistas `mv_hacinamiento_hogar`, `mv_nbi_hogar` (definir fórmula NBI exacta)
- [ ] Formulario con hacinamiento en vivo, exportación CSV/Excel/PDF

## Fase 5 — Educación (MOD-05) — **PENDIENTE**

- [ ] Entidades: `habitante_educaciones`, `habitante_lenguas`
- [ ] Dashboard de alfabetismo/asistencia/nivel
- [ ] Tests de cálculo de tasas

## Fase 6 — Economía (MOD-06) — **PENDIENTE**

- [ ] Entidad `habitante_ocupaciones` (`ingreso_mensual` marcado `@CampoSensible`)
- [ ] Tasa de desempleo (PEA configurable)

## Fase 7 — Migración (MOD-07) — **PENDIENTE**

- [ ] Entidad `movimientos_migratorios` (origen/destino, tipo, motivo)
- [ ] Reutiliza el mapa de Fase 3 para visualizar flujos

## Fase 8 — Etnia/Vulnerabilidad (MOD-08) — **PENDIENTE**

- [ ] Entidad `etnias` (administrable solo por equipo del proyecto, ver INT-02)
- [ ] Entidades `habitante_etnias`, `habitante_condiciones_vulnerabilidad` (ambas `@CampoSensible`)
- [ ] Reportes con anonimización k-anonimity — tests obligatorios de esta regla

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

- No volver a correr generadores Nx (`nx g @nx/nest:library`, `nx g @nx/angular:library`, `nx g @nx/js:library`) sobre ninguna de las libs listadas como ya creadas en Fases 0-3 — ya existen y tienen lógica implementada, un generador podría sobrescribir archivos. Si se crea una lib nueva para `libs/web/<dominio>` con contenido Angular (componentes, `HttpClient`), usar `@nx/angular:library` (no `@nx/js:library`): este último genera un `tsconfig.json` sin `moduleResolution: bundler`/`angularCompilerOptions`, lo que rompe la resolución de `@angular/common/http` — ver el `tsconfig.json`/`tsconfig.spec.json`/`jest.config.cts` de `libs/web/georreferenciacion/{data-access,feature}` como plantilla corregida. Además, cualquier `web-*-data-access` que otra lib `feature` vaya a importar necesita su propio `package.json` (mismo formato que `libs/web/demografia/data-access/package.json`) para que `@nx/js:tsc` la resuelva como "librería buildable" en vez de fallar con `TS6059` (rootDir).
- Las migraciones son secuenciales por timestamp; la próxima migración debe numerarse después de `1751800060000` (revisar `database/migrations/` antes de crear una nueva para no chocar con el orden).
- Antes de crear una lib nueva para un dominio de negocio (Fases 4-10), revisar este archivo y el árbol real de `libs/api/<dominio>` / `libs/web/<dominio>` por si ya quedó un `data-access`/`feature` parcialmente creado en una sesión anterior.
- `libs/api/poblacion`, `libs/web/poblacion`, `libs/api/demografia`, `libs/web/demografia`, `libs/api/georreferenciacion` y `libs/web/georreferenciacion` ya existen con lógica completa — Fase 4 (Vivienda) y posteriores deben extenderlas (nuevas entidades/columnas) cuando corresponda, no regenerarlas.
- `libs/api/shared/util` **ya no existe** (se eliminó en Fase 2 por quedar vacío): la utilidad de anonimización k-anonimity y `generarCsv` viven en `libs/shared/util` (cross-runtime).
- `PeriodoCierreHookRegistry` (`libs/api/shared/feature`) es el patrón a seguir para "engancharse" al cierre de un periodo censal desde cualquier dominio nuevo, sin que `domain:periodo-censal` dependa de ese dominio (mismo espíritu que `SyncHandlerRegistry`).
- Antes de dar por buena la dirección de dependencia entre dos dominios nuevos, revisar `eslint.config.mjs`: varias reglas ya vienen predefinidas desde una sesión anterior (p.ej. `poblacion → georreferenciacion`/`vivienda`, `migracion → georreferenciacion`) y fijan de antemano en qué lib debe vivir la orquestación entre dominios (siempre en el lado que SÍ puede importar al otro, nunca al revés) — ver la sección "Orquestación" del plan de Fase 3 para el razonamiento completo.
- `catalogo_items` (genérico, administrable) no es el lugar para datos jerárquicos reales potencialmente numerosos (municipios, veredas): úsalo para catálogos planos o de pocas decenas de nodos; para árboles grandes, crea una entidad dedicada (como `UbicacionGeografica`) que solo referencie un catálogo plano para clasificar el "nivel/tipo" de cada nodo.
- Actualizar este documento (marcar checklist y mover el estado a `COMPLETADA`, agregar rutas creadas) al cerrar cada fase, no solo al final del proyecto.
