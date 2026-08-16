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
    const data = event.params?.data ?? {};
    if (!('batchLimits' in data)) return;

    const competitionId = extractNumericId(event.result?.id);
    if (!competitionId) return;

    try {
      const service = strapi.service('api::competition-result.competition-result') as {
        recomputeCompetition: (competitionId: number) => Promise<void>;
      };

      await service.recomputeCompetition(competitionId);
    } catch (error) {
      strapi.log.error('[competition] recomputeCompetition failed', { competitionId, error });
    }
  },
};
