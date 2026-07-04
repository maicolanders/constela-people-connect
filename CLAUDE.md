# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Guía de contexto para Claude Code al trabajar en este repositorio. Este es un monorepo **Nx** que contiene un frontend en **Angular**, un backend en **NestJS** y una base de datos **PostgreSQL**, para el Sistema de Censo Poblacional Indígena Multi-Comunidad.

## Resumen del proyecto

Aplicación para el registro, consulta y análisis de información censal de comunidades indígenas: población, demografía, georreferenciación, vivienda/servicios, educación, economía, migración, identificación étnica/vulnerabilidad, asignación de recursos y periodos censales.

- El frontend debe operar como **PWA** con soporte de **captura offline** en campo (IndexedDB) y sincronización posterior con el backend.
- Datos sensibles (etnia, salud/discapacidad, ubicación exacta, ingresos) requieren control de acceso reforzado y trazabilidad — ver `docs/requerimientos_censo_indigena.json` para el detalle funcional y no funcional completo.
- Cumplimiento con normatividad colombiana de protección de datos (Ley 1581 de 2012, Decreto 1377 de 2013, Ley 1266 de 2008).

## Estructura del monorepo (Nx)

```
apps/
  frontend/             # Aplicación Angular (PWA)
  api/                  # Aplicación backend en NestJS
  api-e2e/              # Tests e2e del backend
libs/
  shared/
    data-access/        # Interfaces, DTOs y tipos compartidos frontend/backend
    ui/                 # Componentes Angular reutilizables
    util/                # Utilidades puras compartidas
  api/
    <dominio>/
      feature/          # Módulos de negocio NestJS (ej. poblacion, vivienda, migracion)
      data-access/      # Repositorios / entidades TypeORM o Prisma
docs/
  requerimientos_censo_indigena.json   # Documento de requerimientos vigente
  progreso_construccion.md             # Documento de progreso de construcción, se debe validar al iniciar el trabajo y 
                                       # actualizar al finalizar cada fase, se indican las fases que deben estar completadas 
                                       # para iniciar una nueva fase, las fases que estan completas estan marcadas con [x] y las que no estan completas 
                                       # estan marcadas con [ ]. 
                                       

database/
  migrations/     # Migraciones de base de datos
  schemas/        # Esquemas de base de datos
  ddl/            # DDL de base de datos
  seeders/        # Seeders de base de datos
  sql/            # Scripts SQL
  triggers/       # Triggers de base de datos
nx.json
tsconfig.base.json
package.json
```

Los dominios funcionales a mapear en `libs/api/*` y `libs/web/*` son: `poblacion`, `demografia`, `georreferenciacion`, `vivienda`, `educacion`, `economia`, `migracion`, `etnia-vulnerabilidad`, `recursos`, `periodo-censal`. Cada dominio se organiza en `feature` / `data-access` / `ui` siguiendo la convención de límites de Nx (`enforce-module-boundaries`).

> Si la estructura real difiere de esta plantilla, actualiza esta sección para reflejar el estado actual del repo antes de continuar trabajando.

## Comandos esenciales

```bash
# Instalar dependencias
npm install

# Servir apps en desarrollo
nx serve api                 # Backend NestJS (por defecto puerto 3000)
nx serve frontend                 # Frontend Angular (por defecto puerto 4200)

# Compilar
nx build api
nx build frontend
nx run-many -t build         # Compilar todos los proyectos afectados/target

# Pruebas
nx test api                  # Unit tests backend (Jest)
nx test frontend                  # Unit tests frontend (Jest/Karma)
nx e2e api-e2e
nx e2e frontend-e2e
nx affected -t test          # Solo proyectos afectados por el cambio actual

# Lint y formato
nx lint api
nx lint frontend
nx format:write              # Prettier sobre archivos afectados

# Grafo de dependencias (útil para entender impacto de un cambio)
nx graph

# Migraciones de base de datos (ajustar según ORM elegido: TypeORM o Prisma)
nx run api:migration:generate --name=<nombre>
nx run api:migration:run
```

Antes de dar por terminada una tarea de código: correr `nx affected -t lint test build` y confirmar que pasa.

## Convenciones de backend (NestJS)

- Usar una estructura de carpeta limpia basado en buenas practicas como **Domain Driven Design (DDD)** o **Clean Architecture**, con un módulo NestJS por dominio funcional (`PoblacionModule`, `ViviendaModule`, `MigracionModule`, etc.), viviendo en `libs/api/<dominio>/feature`.
- DTOs de entrada validados con `class-validator` / `class-transformer`; nunca confiar en el `body` sin validar.
- Entidades de base de datos en `libs/api/<dominio>/data-access`, separadas de los DTOs expuestos por la API.
- Autenticación JWT + guards de rol (RBAC) reutilizables desde `libs/api/shared` (o `libs/shared/auth` si se crea esa lib). Los guards deben soportar además restricción por comunidad cuando el rol lo requiera (ej. censista solo accede a su comunidad asignada).
- Toda entidad con datos personales debe registrar auditoría (`createdBy`, `updatedBy`, `createdAt`, `updatedAt`, soft delete vía `deletedAt`) — usar un interceptor o mixin común, no repetir en cada entidad.
- Campos sensibles (etnia, discapacidad/salud, ingresos, ubicación exacta) deben quedar claramente marcados (decorador custom o metadata) para poder aplicar reglas de anonimización/serialización distintas según el rol del solicitante.
- Usar PostGIS para datos de geolocalización (columnas `geometry`/`geography`), no lat/lng sueltos como floats si se requieren consultas espaciales.

## Convenciones de frontend (Angular)

- Standalone components (evitar NgModules nuevos salvo que el proyecto ya use el patrón clásico — revisar `apps/web` antes de decidir).
- Un feature Angular por dominio, alineado 1:1 con los módulos del backend, viviendo en `libs/web/<dominio>/feature`.
- Formularios de campo (captura censal) optimizados para uso móvil: reactive forms, validación inline, mínima digitación (selects, autocompletado, catálogos precargados).
- Persistencia offline: usar una librería de almacenamiento local (ej. Dexie/RxDB) encapsulada en un servicio de `data-access`, nunca acceder a IndexedDB directamente desde componentes.
- Estrategia de sincronización offline→online debe quedar centralizada en un servicio único (`SyncService`) con manejo explícito de conflictos (última escritura gana o resolución manual, según se defina).
- i18n habilitado desde el inicio (español como locale base), aunque solo haya un idioma activo por ahora.
- Service Worker / manifest configurados para comportamiento PWA (`@angular/pwa`).
- Se hace uso de tailwindcss para los estilos del frontend.

## Base de datos (PostgreSQL)

- Extensión **PostGIS** habilitada para datos geoespaciales.
- Cada tabla con datos personales debe tener columnas de auditoría y soft delete.
- Periodos censales (`periodo_censal`) como dimensión temporal: los datos de un periodo cerrado no se editan, se versiona hacia un nuevo periodo.
- Usar migraciones versionadas (no editar el esquema a mano); nombrar migraciones de forma descriptiva (`202606xx_add_condicion_vulnerabilidad_table`).
- Considerar vistas materializadas para los dashboards/reportes agregados (RNF de rendimiento).
- Antes de crear una tabla o columna nueva, revisar `docs/requerimientos_censo_indigena.json` para verificar que corresponde a un requerimiento funcional documentado (o proponer la actualización del documento de requerimientos primero).
- los archivos creados o modificados se almacenan en ./database
- crea nombres de objetos en minuscula
- crea nombres de tablas en minuscula
- crea nombres de columnas en minuscula
- crea nombres de claves foraneas en minuscula
- Los Id deben ser autoincrementales con numeros enteros, usando UUID solo para claves foráneas que requieran un identificador único global
- Los timestamps deben ser UTC y representados en formato ISO 8601
- en los nombres de las tablas usar el plural
- en los nombres de las columnas usar el singular
- las claves foraneas se llamaran igual que la tabla referenciada en singular
- las tablas relacionadas con un periodo deben tener un campo de versionado

## Seguridad y datos sensibles (crítico para este proyecto)

- Nunca loguear en consola/logs valores de campos sensibles (etnia, salud, ubicación exacta, documento de identidad, ingresos).
- Toda exportación o reporte agregado debe pasar por una capa de anonimización cuando el grupo resultante sea pequeño (riesgo de identificación indirecta en comunidades con pocos habitantes).
- Los endpoints que exponen datos individuales (no agregados) deben validar rol **y** pertenencia a comunidad del usuario autenticado, no solo el rol.
- Si al implementar una funcionalidad no está claro si un dato es sensible, tratarlo como sensible por defecto y preguntar antes de relajar el control de acceso.

## Testing

- Cada dominio backend debe tener tests unitarios de sus servicios (reglas de negocio, cálculo de indicadores) y tests de integración de sus controllers/endpoints.
- Cada feature de frontend con lógica no trivial (cálculo de hacinamiento, indicadores demográficos, validaciones de duplicados) debe tener tests unitarios de los servicios/pipes involucrados, no solo tests de componentes.
- Priorizar tests para: detección de duplicados de habitantes, cálculo de indicadores (NBI, alfabetismo, desempleo, pirámide poblacional), reglas de anonimización en reportes, y guards de acceso por rol/comunidad.
- Se usa Jest para los tests de backend y frontend



## Qué NO hacer

- No introducir dependencias directas entre `libs/web/*` y `libs/api/*` (deben comunicarse solo vía HTTP/API, nunca importando código del backend en el frontend o viceversa) — respetar los `tags` de Nx y las reglas de `enforce-module-boundaries` en `.eslintrc`.
- No hardcodear catálogos (etnias, lenguas, tipos de vivienda, ocupaciones) en el frontend; deben venir del backend vía endpoints de catálogo administrables.
- No eliminar físicamente (`DELETE`) registros de habitantes/hogares con datos históricos; usar soft delete.
- No asumir conectividad permanente en las pantallas de captura de campo; toda pantalla de registro debe funcionar en modo offline por defecto.

## Documento de referencia

El detalle completo de requerimientos funcionales y no funcionales (10 módulos, roles, RNF, integraciones futuras) vive en `docs/requerimientos_censo_indigena.json`. Consultarlo antes de implementar cualquier módulo nuevo, y proponer su actualización si el alcance cambia durante el desarrollo.
