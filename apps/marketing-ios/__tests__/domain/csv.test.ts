import { parseMetricsCsv } from '@/lib/import/csv';

describe('parseMetricsCsv', () => {
  it('parses a valid header row', () => {
    const csv = `platform,kpi,value,period_start,period_end,measurement_type
linkedin,followers,1200,2025-01-01,2025-01-07,actual`;
    const rows = parseMetricsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].platform).toBe('linkedin');
    expect(rows[0].kpi_key).toBe('followers');
    expect(rows[0].value).toBe(1200);
  });
});
