import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";

type BigNumberProps = {
  value: number;
  decimals?: number;
  duration?: number;
};

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function BigNumber({ value, decimals = 1, duration = 900 }: BigNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const displayRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);

    const from = displayRef.current;
    const to = value;
    const startTime = Date.now();

    const tick = () => {
      const progress = Math.min(1, (Date.now() - startTime) / duration);
      const current = from + (to - from) * easeOutCubic(progress);
      displayRef.current = current;
      setDisplayValue(current);
      frameRef.current = progress < 1 ? requestAnimationFrame(tick) : null;
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
    // Animates from wherever the number is currently displayed toward the new
    // value (including from 0 on first mount) — `duration` is intentionally
    // excluded so changing it wouldn't retrigger a run already in flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Text className="font-display text-ink" style={{ fontSize: 88, lineHeight: 92 }}>
      {displayValue.toFixed(decimals)}
    </Text>
  );
}
