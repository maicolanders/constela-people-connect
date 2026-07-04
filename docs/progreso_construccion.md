# Progreso de construcción — Censo Poblacional Indígena Multi-Comunidad

Última actualización: 2026-07-04 (Fase 1 completada)

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

## Fase 2 — Demografía (MOD-02) — **PENDIENTE**

- [ ] Columna `identidad_genero_id` en `habitantes`
- [ ] Vista materializada `mv_indicadores_demograficos_periodo` (dependencia, envejecimiento, natalidad/mortalidad)
- [ ] Pirámide poblacional exportable
- [ ] Tests de cálculo de grupos quinquenales e indicadores

## Fase 3 — Georreferenciación (MOD-03) — **PENDIENTE**

- [ ] Entidades PostGIS: `ubicaciones_geograficas`, `hogar_ubicaciones` (geometry punto)
- [ ] Mapa interactivo con Leaflet, captura GPS offline
- [ ] Endpoint de mapa agregado/anonimizado según rol

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

---

## Notas para evitar sobre-escritura

- No volver a correr generadores Nx (`nx g @nx/nest:library`, `nx g @nx/angular:library`) sobre ninguna de las libs listadas como ya creadas en Fase 0 o Fase 1 — ya existen y tienen lógica implementada, un generador podría sobrescribir archivos.
- Las migraciones son secuenciales por timestamp; la próxima migración debe numerarse después de `1751600180000` (revisar `database/migrations/` antes de crear una nueva para no chocar con el orden).
- Antes de crear una lib nueva para un dominio de negocio (Fases 2-10), revisar este archivo y el árbol real de `libs/api/<dominio>` / `libs/web/<dominio>` por si ya quedó un `data-access`/`feature` parcialmente creado en una sesión anterior.
- `libs/api/poblacion` y `libs/web/poblacion` ya existen con lógica completa de Fase 1 — Fase 4 (Vivienda) y posteriores deben extenderlas (nuevas entidades/columnas), no regenerarlas.
- Actualizar este documento (marcar checklist y mover el estado a `COMPLETADA`, agregar rutas creadas) al cerrar cada fase, no solo al final del proyecto.
