import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { CatalogoItem } from '@censo/api-catalogo-data-access';
import { HabitanteService } from '@censo/api-poblacion-feature';
import { DataSource, Repository } from 'typeorm';
import { EtniaVulnerabilidadService } from './etnia-vulnerabilidad.service';

/** Subconjunto de la API de pdfkit que este servicio usa — evita depender del
 * namespace ambiental global `PDFKit` de `@types/pdfkit` (tipado como una
 * instancia, `export = doc`, no como la clase constructora). */
interface DocumentoPdf {
  fontSize(size: number): DocumentoPdf;
  text(texto: string, opciones?: Record<string, unknown>): DocumentoPdf;
  moveDown(lineas?: number): DocumentoPdf;
  end(): void;
  pipe<T extends NodeJS.WritableStream>(destino: T): T;
}

const PDFDocument: new (options?: Record<string, unknown>) => DocumentoPdf = require('pdfkit');

/**
 * Constancia de afiliación a resguardo (Fase 14, autogestión): resuelve
 * `HabitanteEtnia` + nombre del ítem de catálogo `etnia` + nombre del
 * resguardo. `resguardoUbicacionGeograficaId` es una columna simple sin
 * relación TypeORM (`domain:etnia-vulnerabilidad` no puede depender de
 * `domain:georreferenciacion`, ver eslint.config.mjs) — el nombre del
 * resguardo se resuelve con SQL directo contra `ubicaciones_geograficas`,
 * mismo patrón ya usado para cruzar límites de dominio en Fase 9/10.
 */
@Injectable()
export class ConstanciaAfiliacionService {
  constructor(
    private readonly etniaVulnerabilidadService: EtniaVulnerabilidadService,
    private readonly habitanteService: HabitanteService,
    @InjectRepository(CatalogoItem) private readonly catalogoItemRepository: Repository<CatalogoItem>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async generar(habitanteId: number): Promise<DocumentoPdf> {
    const etnia = await this.etniaVulnerabilidadService.obtenerPorHabitante(habitanteId);
    if (!etnia.resguardoUbicacionGeograficaId) {
      throw new NotFoundException('El habitante no tiene un resguardo/territorio asociado');
    }

    const habitante = await this.habitanteService.obtener(habitanteId);
    const etniaItem = await this.catalogoItemRepository.findOne({ where: { id: etnia.etniaCatalogoItemId } });

    const filas: Array<{ nombre: string }> = await this.dataSource.query(
      'SELECT nombre FROM ubicaciones_geograficas WHERE id = $1',
      [etnia.resguardoUbicacionGeograficaId],
    );
    const nombreResguardo = filas[0]?.nombre ?? 'Resguardo no identificado';

    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    doc
      .fontSize(16)
      .text('Constancia de Afiliación a Resguardo Indígena', { align: 'center' })
      .moveDown(2);
    doc
      .fontSize(11)
      .text(`Se hace constar que ${habitante.nombres} ${habitante.apellidos}`)
      .text(`identificado(a) con documento No. ${habitante.numeroDocumento ?? habitante.identificadorInterno}`)
      .text(`se encuentra afiliado(a) al resguardo/territorio: ${nombreResguardo}`)
      .text(`Identificación étnica: ${etniaItem?.nombre ?? 'No especificada'}`)
      .moveDown(2)
      .text(`Fecha de expedición: ${new Date().toLocaleDateString('es-CO')}`);
    doc.end();

    return doc;
  }
}
