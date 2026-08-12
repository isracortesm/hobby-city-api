import type { Core } from '@strapi/strapi';
import competitionResultEmailOverride from './documentation/competition-result-email';

const SCALAR_TYPES = new Set([
  'string',
  'text',
  'richtext',
  'email',
  'enumeration',
  'uid',
  'integer',
  'biginteger',
  'float',
  'decimal',
  'boolean',
  'date',
  'time',
  'datetime',
  'timestamp',
  'json',
  'password',
]);

type AttributeLike = { type?: string; relation?: string; target?: string };
type ContentTypeLike = { uid: string; attributes: Record<string, AttributeLike> };
type ConfigLike = {
  settings?: { mainField?: string; defaultSortBy?: string };
  metadatas?: Record<string, { edit?: { mainField?: string } }>;
};

function findFirstStringAttribute(attributes: Record<string, AttributeLike>): string | null {
  const entry = Object.entries(attributes).find(
    ([name, attribute]) => attribute.type === 'string' && name !== 'id' && name !== 'locale'
  );
  return entry ? entry[0] : null;
}

function isScalarAttribute(attribute: AttributeLike | undefined): boolean {
  return !!attribute && SCALAR_TYPES.has(attribute.type ?? '');
}

/**
 * Returns true when the referenced field is a known non-sortable attribute
 * (relation/component/media). Virtual fields not present in the schema
 * attributes (documentId, id, locale, timestamps, createdBy/updatedBy) are
 * left untouched.
 */
function referencesNonScalar(
  attributes: Record<string, AttributeLike>,
  name: string
): boolean {
  const attribute = attributes[name];
  return !!attribute && !isScalarAttribute(attribute);
}

async function fixContentManagerConfigurations(strapi: Core.Strapi): Promise<void> {
  const store = strapi.store({ type: 'plugin', name: 'content_manager' });
  const contentTypes = Object.values(strapi.contentTypes) as ContentTypeLike[];

  for (const model of contentTypes) {
    if (!model.uid.startsWith('api::')) continue;

    const key = `configuration_content_types::${model.uid}`;
    const config = (await store.get({ key })) as ConfigLike | null;
    if (!config) continue;

    const defaultMainField = findFirstStringAttribute(model.attributes) ?? 'documentId';
    const settings = config.settings ?? {};
    let changed = false;

    if (settings.mainField && referencesNonScalar(model.attributes, settings.mainField)) {
      settings.mainField = defaultMainField;
      changed = true;
    }
    if (settings.defaultSortBy && referencesNonScalar(model.attributes, settings.defaultSortBy)) {
      settings.defaultSortBy = defaultMainField;
      changed = true;
    }

    for (const [name, attribute] of Object.entries(model.attributes)) {
      if (attribute.type !== 'relation' || !attribute.target) continue;
      const mainField = config.metadatas?.[name]?.edit?.mainField;
      if (!mainField) continue;
      const target = strapi.contentTypes[attribute.target] as ContentTypeLike | undefined;
      if (!target) continue;
      if (!referencesNonScalar(target.attributes, mainField)) continue;

      const targetDefault = findFirstStringAttribute(target.attributes) ?? 'id';
      if (config.metadatas?.[name]?.edit) {
        config.metadatas[name].edit!.mainField = targetDefault;
        changed = true;
      }
    }

    if (changed) {
      await store.set({ key, value: config });
    }
  }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi
      .plugin('documentation')
      .service('override')
      .registerOverride(competitionResultEmailOverride);
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await fixContentManagerConfigurations(strapi);
  },
};
