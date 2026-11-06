import { useAppTheme } from '@/hooks/useAppTheme';
import type { ChartPoint } from '@/lib/domain/analyticsAggregation';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { Caption } from './AppText';

const W = 280;
const H = 120;
const PAD = 12;

export function SimpleLineChart({
  points,
  emptyLabel,
}: {
  points: ChartPoint[];
  emptyLabel: string;
}) {
  const t = useAppTheme();

  if (points.length === 0) {
    return <Caption>{emptyLabel}</Caption>;
  }

  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;

  const coords = points.map((p, i) => {
    const x = PAD + (i / Math.max(1, points.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((p.value - min) / span) * (H - PAD * 2);
    return { x, y, kind: p.kind };
  });

  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');

  return (
    <View style={styles.wrap}>
      <Svg width={W} height={H}>
        <Line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={t.border} strokeWidth={1} />
        <Polyline points={linePoints} fill="none" stroke={t.chartActual} strokeWidth={2} />
        {coords.map((c, i) => (
          <Circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={3}
            fill={c.kind === 'calculated' ? t.chartCalculated : t.chartActual}
          />
        ))}
      </Svg>
      <Caption style={styles.legend}>
        ● Measured · ○ Derived (calculated values)
      </Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start' },
  legend: { marginTop: 8 },
});
