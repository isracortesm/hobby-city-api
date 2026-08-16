"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = void 0;
/**
 * Error HTTP 409 (Conflict). Strapi convierte cualquier Error con `.status`
 * 4xx y `.expose = true` en esa respuesta HTTP, permitiendo que el frontend
 * distinga un conflicto (entidad ya existente) de un error de validación.
 */
class ConflictError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'ConflictError';
        this.status = 409;
        this.expose = true;
        this.details = details;
    }
}
exports.ConflictError = ConflictError;
