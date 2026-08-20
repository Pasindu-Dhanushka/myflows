"use client";

import { useEffect, useRef, useState } from "react";

type CountUpStatProps = {
  value: number;
  label: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
};

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

function formatValue(value: number, decimals: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

export function CountUpStat({
  value,
  label,
  suffix = "",
  decimals = 0,
  duration = 1400
}: CountUpStatProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const statRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = statRef.current;

    if (!element || hasAnimated) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        setHasAnimated(true);
        const startedAt = performance.now();

        const animate = (timestamp: number) => {
          const elapsed = timestamp - startedAt;
          const progress = Math.min(elapsed / duration, 1);
          setDisplayValue(value * easeOutCubic(progress));

          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };

        requestAnimationFrame(animate);
        observer.disconnect();
      },
      { threshold: 0.35 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [duration, hasAnimated, value]);

  return (
    <div ref={statRef}>
      <strong>
        {formatValue(displayValue, decimals)}
        {suffix}
      </strong>
      <span>{label}</span>
    </div>
  );
}
