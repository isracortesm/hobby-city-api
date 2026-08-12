"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const competition_result_email_1 = __importDefault(require("./documentation/competition-result-email"));
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
function findFirstStringAttribute(attributes) {
    const entry = Object.entries(attributes).find(([name, attribute]) => attribute.type === 'string' && name !== 'id' && name !== 'locale');
    return entry ? entry[0] : null;
}
function isScalarAttribute(attribute) {
    var _a;
    return !!attribute && SCALAR_TYPES.has((_a = attribute.type) !== null && _a !== void 0 ? _a : '');
}
/**
 * Returns true when the referenced field is a known non-sortable attribute
 * (relation/component/media). Virtual fields not present in the schema
 * attributes (documentId, id, locale, timestamps, createdBy/updatedBy) are
 * left untouched.
 */
function referencesNonScalar(attributes, name) {
    const attribute = attributes[name];
    return !!attribute && !isScalarAttribute(attribute);
}
async function fixContentManagerConfigurations(strapi) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const store = strapi.store({ type: 'plugin', name: 'content_manager' });
    const contentTypes = Object.values(strapi.contentTypes);
    for (const model of contentTypes) {
        if (!model.uid.startsWith('api::'))
            continue;
        const key = `configuration_content_types::${model.uid}`;
        const config = (await store.get({ key }));
        if (!config)
            continue;
        const defaultMainField = (_a = findFirstStringAttribute(model.attributes)) !== null && _a !== void 0 ? _a : 'documentId';
        const settings = (_b = config.settings) !== null && _b !== void 0 ? _b : {};
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
            if (attribute.type !== 'relation' || !attribute.target)
                continue;
            const mainField = (_e = (_d = (_c = config.metadatas) === null || _c === void 0 ? void 0 : _c[name]) === null || _d === void 0 ? void 0 : _d.edit) === null || _e === void 0 ? void 0 : _e.mainField;
            if (!mainField)
                continue;
            const target = strapi.contentTypes[attribute.target];
            if (!target)
                continue;
            if (!referencesNonScalar(target.attributes, mainField))
                continue;
            const targetDefault = (_f = findFirstStringAttribute(target.attributes)) !== null && _f !== void 0 ? _f : 'id';
            if ((_h = (_g = config.metadatas) === null || _g === void 0 ? void 0 : _g[name]) === null || _h === void 0 ? void 0 : _h.edit) {
                config.metadatas[name].edit.mainField = targetDefault;
                changed = true;
            }
        }
        if (changed) {
            await store.set({ key, value: config });
        }
    }
}
exports.default = {
    /**
     * An asynchronous register function that runs before
     * your application is initialized.
     *
     * This gives you an opportunity to extend code.
     */
    register({ strapi }) {
        strapi
            .plugin('documentation')
            .service('override')
            .registerOverride(competition_result_email_1.default);
    },
    /**
     * An asynchronous bootstrap function that runs before
     * your application gets started.
     *
     * This gives you an opportunity to set up your data model,
     * run jobs, or perform some special logic.
     */
    async bootstrap({ strapi }) {
        await fixContentManagerConfigurations(strapi);
    },
};
