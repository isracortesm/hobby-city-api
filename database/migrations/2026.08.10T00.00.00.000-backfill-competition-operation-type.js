'use strict';

/**
 * Mueve operationType de competition-batch a competition.
 *
 * - Agrega la columna operation_type a competitions (por si el sync de schema
 *   aún no la ha creado, ya que las migraciones corren antes que el sync).
 * - Backfill: los competitions existentes quedan en 'average' (default del schema).
 * - Elimina la columna huérfana operation_type de competition_batches, ya que
 *   el campo se removió del schema y Strapi no dropea columnas.
 */
module.exports = {
  async up(knex) {
    await knex.raw(
      'ALTER TABLE competitions ADD COLUMN IF NOT EXISTS operation_type VARCHAR(255)'
    );
    await knex.raw(
      "UPDATE competitions SET operation_type = 'average' WHERE operation_type IS NULL"
    );
    await knex.raw(
      'ALTER TABLE competition_batches DROP COLUMN IF EXISTS operation_type'
    );
  },

  async down(knex) {
    await knex.raw(
      "ALTER TABLE competition_batches ADD COLUMN operation_type VARCHAR(255) DEFAULT 'average'"
    );
    await knex.raw(
      'ALTER TABLE competitions DROP COLUMN IF EXISTS operation_type'
    );
  },
};
