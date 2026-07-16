# Project Conventions & Learnings

## Lifecycle Hooks — Query Engine vs Document Service

### Regla

En lifecycle hooks (`lifecycles.ts`), usa siempre `strapi.db.query()` en
lugar de `strapi.documents()` cuando necesites acceder a **relaciones
con populate**.

### Motivo

`strapi.documents()` opera a nivel Document Service (abstracción i18n /
draft & publish). Dentro de un lifecycle hook, sus métodos `findOne` /
`findFirst` con `populate` **no resuelven relaciones** — devuelven null.

`strapi.db.query()` opera a nivel Query Engine y hace JOIN directo en
BD, por lo que `populate` funciona correctamente.

### Ejemplo

```typescript
// ✅ Correcto — Query Engine
const record = await strapi.db
  .query('api::activity-participant.activity-participant')
  .findOne({ where, populate: { activity: true } });

// ❌ No funciona — Document Service
const record = await strapi.documents(
  'api::activity-participant.activity-participant'
).findOne({ documentId, populate: { activity: true } });
```
