function extractNumericId(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

export default {
  async afterUpdate(event: any) {
    const resultId = extractNumericId(event.result?.id);
    if (!resultId) return;

    const service = strapi.service('api::competition-result.competition-result') as {
      recomputeResult: (resultId: number) => Promise<void>;
    };

    await service.recomputeResult(resultId);
  },
};
