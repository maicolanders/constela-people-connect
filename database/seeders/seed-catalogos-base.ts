import { DataSource } from 'typeorm';

interface ItemSemilla {
  codigo: string;
  nombre: string;
}

interface CatalogoSemilla {
  codigo: string;
  nombre: string;
  jerarquico: boolean;
  items: ItemSemilla[];
}

/**
 * Catálogos base para que los formularios de captura tengan opciones desde
 * el primer arranque. Son un punto de partida representativo, no el listado
 * exhaustivo final: la administración completa (RT-02) es responsabilidad
 * del rol Administrador vía los endpoints de /catalogos.
 */
const CATALOGOS: CatalogoSemilla[] = [
  {
    codigo: 'tipo_documento',
    nombre: 'Tipo de documento de identidad',
    jerarquico: false,
    items: [
      { codigo: 'cedula_ciudadania', nombre: 'Cédula de ciudadanía' },
      { codigo: 'tarjeta_identidad', nombre: 'Tarjeta de identidad' },
      { codigo: 'registro_civil', nombre: 'Registro civil de nacimiento' },
      { codigo: 'cedula_extranjeria', nombre: 'Cédula de extranjería' },
      { codigo: 'sin_documento', nombre: 'Sin documento (identificador interno)' },
    ],
  },
  {
    codigo: 'parentesco',
    nombre: 'Parentesco con el jefe de hogar',
    jerarquico: false,
    items: [
      { codigo: 'jefe_hogar', nombre: 'Jefe de hogar' },
      { codigo: 'conyuge', nombre: 'Cónyuge o pareja' },
      { codigo: 'hijo', nombre: 'Hijo/a' },
      { codigo: 'nieto', nombre: 'Nieto/a' },
      { codigo: 'padre_madre', nombre: 'Padre o madre' },
      { codigo: 'hermano', nombre: 'Hermano/a' },
      { codigo: 'otro_familiar', nombre: 'Otro familiar' },
      { codigo: 'no_familiar', nombre: 'No familiar' },
    ],
  },
  {
    codigo: 'nivel_geografico',
    nombre: 'Nivel de la jerarquía geográfica',
    jerarquico: false,
    items: [
      { codigo: 'pais', nombre: 'País' },
      { codigo: 'departamento', nombre: 'Departamento' },
      { codigo: 'municipio', nombre: 'Municipio' },
      { codigo: 'resguardo_territorio', nombre: 'Resguardo / territorio indígena' },
      { codigo: 'vereda_comunidad', nombre: 'Vereda / comunidad' },
    ],
  },
  {
    codigo: 'tipo_territorio',
    nombre: 'Tipo de territorio',
    jerarquico: false,
    items: [
      { codigo: 'resguardo_indigena', nombre: 'Resguardo indígena' },
      { codigo: 'parcialidad_indigena', nombre: 'Parcialidad indígena' },
      { codigo: 'territorio_ancestral', nombre: 'Territorio ancestral' },
      { codigo: 'cabildo_menor', nombre: 'Cabildo menor' },
      { codigo: 'otro', nombre: 'Otro' },
    ],
  },
  {
    codigo: 'lengua',
    nombre: 'Lengua',
    jerarquico: false,
    items: [
      { codigo: 'espanol', nombre: 'Español' },
      { codigo: 'wayuunaiki', nombre: 'Wayuunaiki' },
      { codigo: 'nasa_yuwe', nombre: 'Nasa Yuwe' },
      { codigo: 'embera', nombre: 'Embera' },
      { codigo: 'quechua', nombre: 'Quechua' },
      { codigo: 'wounaan', nombre: 'Wounaan' },
      { codigo: 'palenquero', nombre: 'Palenquero' },
      { codigo: 'otro', nombre: 'Otra lengua' },
    ],
  },
  {
    codigo: 'tipo_vivienda',
    nombre: 'Tipo de vivienda',
    jerarquico: false,
    items: [
      { codigo: 'casa', nombre: 'Casa' },
      { codigo: 'apartamento', nombre: 'Apartamento' },
      { codigo: 'choza_rancho', nombre: 'Choza o rancho' },
      { codigo: 'vivienda_tradicional_indigena', nombre: 'Vivienda tradicional indígena' },
      { codigo: 'otro', nombre: 'Otro' },
    ],
  },
  {
    codigo: 'material_pared',
    nombre: 'Material predominante de las paredes',
    jerarquico: false,
    items: [
      { codigo: 'bloque_ladrillo', nombre: 'Bloque o ladrillo' },
      { codigo: 'adobe_bahareque', nombre: 'Adobe o bahareque' },
      { codigo: 'madera', nombre: 'Madera' },
      { codigo: 'guadua_cana', nombre: 'Guadua o caña' },
      { codigo: 'material_natural', nombre: 'Material natural (palma, hoja, etc.)' },
      { codigo: 'otro', nombre: 'Otro' },
    ],
  },
  {
    codigo: 'material_piso',
    nombre: 'Material predominante del piso',
    jerarquico: false,
    items: [
      { codigo: 'baldosa_vinilo', nombre: 'Baldosa o vinilo' },
      { codigo: 'cemento', nombre: 'Cemento' },
      { codigo: 'tierra', nombre: 'Tierra' },
      { codigo: 'madera', nombre: 'Madera' },
      { codigo: 'otro', nombre: 'Otro' },
    ],
  },
  {
    codigo: 'material_techo',
    nombre: 'Material predominante del techo',
    jerarquico: false,
    items: [
      { codigo: 'teja_zinc', nombre: 'Teja de zinc' },
      { codigo: 'teja_barro', nombre: 'Teja de barro' },
      { codigo: 'paja_palma', nombre: 'Paja o palma' },
      { codigo: 'concreto', nombre: 'Concreto' },
      { codigo: 'otro', nombre: 'Otro' },
    ],
  },
  {
    codigo: 'ocupacion',
    nombre: 'Ocupación',
    jerarquico: false,
    items: [
      { codigo: 'agricultura_subsistencia', nombre: 'Agricultura de subsistencia' },
      { codigo: 'artesania', nombre: 'Artesanía' },
      { codigo: 'pesca', nombre: 'Pesca' },
      { codigo: 'jornalero', nombre: 'Jornalero' },
      { codigo: 'empleado_formal', nombre: 'Empleado formal' },
      { codigo: 'comercio_informal', nombre: 'Comercio informal' },
      { codigo: 'estudiante', nombre: 'Estudiante' },
      { codigo: 'labores_hogar', nombre: 'Labores del hogar' },
      { codigo: 'desempleado', nombre: 'Desempleado' },
      { codigo: 'otro', nombre: 'Otro' },
    ],
  },
  {
    codigo: 'nivel_educativo',
    nombre: 'Nivel educativo',
    jerarquico: false,
    items: [
      { codigo: 'ninguno', nombre: 'Ninguno' },
      { codigo: 'preescolar', nombre: 'Preescolar' },
      { codigo: 'basica_primaria', nombre: 'Básica primaria' },
      { codigo: 'basica_secundaria', nombre: 'Básica secundaria' },
      { codigo: 'media', nombre: 'Media' },
      { codigo: 'tecnico_tecnologico', nombre: 'Técnico o tecnológico' },
      { codigo: 'universitario', nombre: 'Universitario' },
      { codigo: 'posgrado', nombre: 'Posgrado' },
    ],
  },
  {
    codigo: 'condicion_vulnerabilidad',
    nombre: 'Condición de vulnerabilidad',
    jerarquico: false,
    items: [
      { codigo: 'discapacidad_fisica', nombre: 'Discapacidad física' },
      { codigo: 'discapacidad_visual', nombre: 'Discapacidad visual' },
      { codigo: 'discapacidad_auditiva', nombre: 'Discapacidad auditiva' },
      { codigo: 'discapacidad_cognitiva', nombre: 'Discapacidad cognitiva' },
      { codigo: 'victima_conflicto_armado', nombre: 'Víctima de conflicto armado' },
      { codigo: 'adulto_mayor_sin_apoyo', nombre: 'Adulto mayor sin red de apoyo' },
      { codigo: 'mujer_gestante_lactante', nombre: 'Mujer gestante o lactante' },
      { codigo: 'ninez_en_riesgo', nombre: 'Niñez en riesgo' },
      { codigo: 'otro', nombre: 'Otra' },
    ],
  },
  {
    codigo: 'motivo_migracion',
    nombre: 'Motivo de migración',
    jerarquico: false,
    items: [
      { codigo: 'laboral', nombre: 'Laboral' },
      { codigo: 'educativo', nombre: 'Educativo' },
      { codigo: 'desplazamiento_forzado', nombre: 'Desplazamiento forzado' },
      { codigo: 'reunificacion_familiar', nombre: 'Reunificación familiar' },
      { codigo: 'salud', nombre: 'Salud' },
      { codigo: 'otro', nombre: 'Otro' },
    ],
  },
  {
    codigo: 'fuente_agua',
    nombre: 'Fuente de agua potable',
    jerarquico: false,
    items: [
      { codigo: 'acueducto', nombre: 'Acueducto' },
      { codigo: 'pozo', nombre: 'Pozo' },
      { codigo: 'rio_quebrada', nombre: 'Río o quebrada' },
      { codigo: 'agua_lluvia', nombre: 'Agua lluvia' },
      { codigo: 'carrotanque', nombre: 'Carrotanque' },
      { codigo: 'otro', nombre: 'Otra' },
    ],
  },
  {
    codigo: 'tipo_saneamiento',
    nombre: 'Tipo de saneamiento / disposición de excretas',
    jerarquico: false,
    items: [
      { codigo: 'alcantarillado', nombre: 'Alcantarillado' },
      { codigo: 'pozo_septico', nombre: 'Pozo séptico' },
      { codigo: 'letrina', nombre: 'Letrina' },
      { codigo: 'campo_abierto', nombre: 'Campo abierto' },
      { codigo: 'otro', nombre: 'Otro' },
    ],
  },
  {
    codigo: 'fuente_energia',
    nombre: 'Fuente de energía eléctrica',
    jerarquico: false,
    items: [
      { codigo: 'red_electrica', nombre: 'Red eléctrica' },
      { codigo: 'planta_solar', nombre: 'Planta solar' },
      { codigo: 'planta_electrica', nombre: 'Planta eléctrica' },
      { codigo: 'vela_mechero', nombre: 'Vela o mechero' },
      { codigo: 'ninguna', nombre: 'Ninguna' },
    ],
  },
];

export async function seedCatalogosBase(dataSource: DataSource): Promise<void> {
  for (const catalogo of CATALOGOS) {
    await dataSource.query(
      `INSERT INTO catalogo_tipos (codigo, nombre, jerarquico) VALUES ($1, $2, $3) ON CONFLICT (codigo) DO NOTHING;`,
      [catalogo.codigo, catalogo.nombre, catalogo.jerarquico],
    );

    const [{ id: catalogoTipoId }] = await dataSource.query(`SELECT id FROM catalogo_tipos WHERE codigo = $1;`, [
      catalogo.codigo,
    ]);

    for (const [indice, item] of catalogo.items.entries()) {
      await dataSource.query(
        `INSERT INTO catalogo_items (catalogo_tipo_id, codigo, nombre, orden)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (catalogo_tipo_id, codigo) DO NOTHING;`,
        [catalogoTipoId, item.codigo, item.nombre, indice],
      );
    }
  }
}
