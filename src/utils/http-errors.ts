/**
 * Error HTTP 409 (Conflict). Strapi convierte cualquier Error con `.status`
 * 4xx y `.expose = true` en esa respuesta HTTP, permitiendo que el frontend
 * distinga un conflicto (entidad ya existente) de un error de validación.
 */
export class ConflictError extends Error {
  public readonly status: number;
  public readonly expose: boolean;
  public readonly details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ConflictError';
    this.status = 409;
    this.expose = true;
    this.details = details;
  }
}
