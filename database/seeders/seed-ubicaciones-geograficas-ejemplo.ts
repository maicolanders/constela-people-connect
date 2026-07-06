import { DataSource } from 'typeorm';

interface NodoSemilla {
  nivel: string;
  nombre: string;
  codigo?: string;
  hijos?: NodoSemilla[];
}

/**
 * Árbol representativo (no exhaustivo, mismo criterio que
 * seed-catalogos-base.ts) para que el formulario de ubicación de hogar y las
 * pruebas end-to-end tengan nodos reales desde el primer arranque. La
 * administración completa de la jerarquía (RT-02) es responsabilidad del rol
 * Administrador vía /georreferenciacion/ubicaciones-geograficas.
 */
const ARBOL: NodoSemilla = {
  nivel: 'pais',
  nombre: 'Colombia',
  codigo: 'CO',
  hijos: [
    {
      nivel: 'departamento',
      nombre: 'Cauca',
      codigo: '19',
      hijos: [
        {
          nivel: 'municipio',
          nombre: 'Popayán',
          codigo: '19001',
          hijos: [
            { nivel: 'resguardo_territorio', nombre: 'Resguardo Indígena de Puracé' },
            { nivel: 'vereda_comunidad', nombre: 'Vereda La Yunga' },
          ],
        },
        {
          nivel: 'municipio',
          nombre: 'Silvia',
          codigo: '19785',
          hijos: [{ nivel: 'resguardo_territorio', nombre: 'Resguardo Indígena de Guambía' }],
        },
      ],
    },
    {
      nivel: 'departamento',
      nombre: 'La Guajira',
      codigo: '44',
      hijos: [
        {
          nivel: 'municipio',
          nombre: 'Uribia',
          codigo: '44847',
          hijos: [{ nivel: 'resguardo_territorio', nombre: 'Resguardo Indígena de la Alta y Media Guajira' }],
        },
      ],
    },
  ],
};

async function insertarNodo(dataSource: DataSource, nodo: NodoSemilla, padreId: number | null): Promise<void> {
  const [{ id: nivelCatalogoItemId }] = await dataSource.query(
    `SELECT ci.id FROM catalogo_items ci
     JOIN catalogo_tipos ct ON ct.id = ci.catalogo_tipo_id
     WHERE ct.codigo = 'nivel_geografico' AND ci.codigo = $1;`,
    [nodo.nivel],
  );

  const existente = await dataSource.query(
    `SELECT id FROM ubicaciones_geograficas
     WHERE nivel_geografico_catalogo_item_id = $1 AND nombre = $2 AND padre_id IS NOT DISTINCT FROM $3;`,
    [nivelCatalogoItemId, nodo.nombre, padreId],
  );

  const id: number =
    existente.length > 0
      ? existente[0].id
      : (
          await dataSource.query(
            `INSERT INTO ubicaciones_geograficas (nivel_geografico_catalogo_item_id, padre_id, nombre, codigo)
             VALUES ($1, $2, $3, $4) RETURNING id;`,
            [nivelCatalogoItemId, padreId, nodo.nombre, nodo.codigo ?? null],
          )
        )[0].id;

  for (const hijo of nodo.hijos ?? []) {
    await insertarNodo(dataSource, hijo, id);
  }
}

export async function seedUbicacionesGeograficasEjemplo(dataSource: DataSource): Promise<void> {
  await insertarNodo(dataSource, ARBOL, null);
}
