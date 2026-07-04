import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtro de excepciones único para toda la API: respuesta consistente y logs
 * sin volcar el body de la petición (puede traer campos sensibles).
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const respuestaExcepcion = exception instanceof HttpException ? exception.getResponse() : null;
    const mensaje =
      respuestaExcepcion && typeof respuestaExcepcion === 'object' && 'message' in respuestaExcepcion
        ? (respuestaExcepcion as { message: unknown }).message
        : exception instanceof Error
          ? exception.message
          : 'Error interno del servidor';

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url} -> ${status}`, exception instanceof Error ? exception.stack : undefined);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: mensaje,
    });
  }
}
