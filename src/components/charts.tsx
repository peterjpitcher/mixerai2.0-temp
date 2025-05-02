'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/card';
import { cn } from "@/lib/utils";

interface ChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: Array<{ label: string; value: number }>;
  showLabels?: boolean;
  height?: number;
  width?: number | string;
  className?: string;
}

export function BarChart({
  data,
  showLabels = true,
  height = 300,
  className,
  ...props
}: ChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className={cn("w-full", className)} style={{ height }} {...props}>
      <div className="flex h-full items-end justify-between">
        {data.map((item, index) => (
          <div key={item.label} className="flex flex-col items-center">
            <div
              className="bg-primary w-12 rounded-t-md"
              style={{
                height: `${Math.max(
                  (item.value / maxValue) * (height - 50),
                  12
                )}px`,
              }}
            ></div>
            {showLabels && (
              <>
                <span className="mt-2 text-xs text-muted-foreground">
                  {item.label}
                </span>
                <span className="mt-1 text-xs font-medium">{item.value}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart({
  data,
  showLabels = true,
  height = 300,
  className,
  ...props
}: ChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value));
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - (d.value / maxValue) * 100,
    ...d,
  }));

  const pathData = points
    .map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div className={cn("w-full", className)} style={{ height }} {...props}>
      <div className="relative h-full w-full">
        <svg
          className="h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            d={pathData}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary"
          />
        </svg>

        {showLabels && (
          <div className="absolute bottom-0 left-0 w-full flex justify-between px-2">
            {data.map((item, index) => (
              <div
                key={index}
                className="flex flex-col items-center"
                style={{ left: `${(index / (data.length - 1)) * 100}%` }}
              >
                <span className="text-xs text-muted-foreground">
                  {item.label}
                </span>
                <span className="text-xs font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PieChart({
  data,
  showLabels = true,
  height = 300,
  className,
  ...props
}: ChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  const colors = [
    "fill-blue-500",
    "fill-green-500",
    "fill-yellow-500",
    "fill-red-500",
    "fill-purple-500",
    "fill-pink-500",
    "fill-indigo-500",
    "fill-cyan-500",
  ];

  const slices = data.map((item, i) => {
    const startAngle = currentAngle;
    const value = (item.value / total) * 360;
    currentAngle += value;
    const endAngle = currentAngle;

    const x1 = 50 + 40 * Math.cos((Math.PI * startAngle) / 180);
    const y1 = 50 + 40 * Math.sin((Math.PI * startAngle) / 180);
    const x2 = 50 + 40 * Math.cos((Math.PI * endAngle) / 180);
    const y2 = 50 + 40 * Math.sin((Math.PI * endAngle) / 180);

    const largeArcFlag = value > 180 ? 1 : 0;

    const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    return {
      pathData,
      value: item.value,
      label: item.label,
      percentage: ((item.value / total) * 100).toFixed(1),
      color: colors[i % colors.length],
    };
  });

  return (
    <div
      className={cn("w-full flex flex-col items-center", className)}
      style={{ height }}
      {...props}
    >
      <div className="relative" style={{ width: height, height: height }}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full transform -rotate-90"
        >
          {slices.map((slice, i) => (
            <path
              key={i}
              d={slice.pathData}
              className={cn(slice.color)}
              stroke="white"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>

      {showLabels && (
        <div className="mt-4 w-full grid grid-cols-2 gap-2">
          {slices.map((slice, i) => (
            <div key={i} className="flex items-center space-x-2">
              <div
                className={cn("w-3 h-3 rounded-full", slice.color.replace("fill-", "bg-"))}
              ></div>
              <span className="text-xs flex-1 truncate">{slice.label}</span>
              <span className="text-xs font-medium">{slice.percentage}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DonutChart({
  data,
  showLabels = true,
  height = 300,
  className,
  ...props
}: ChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  const colors = [
    "fill-blue-500",
    "fill-green-500",
    "fill-yellow-500",
    "fill-red-500",
    "fill-purple-500",
    "fill-pink-500",
    "fill-indigo-500",
    "fill-cyan-500",
  ];

  const slices = data.map((item, i) => {
    const startAngle = currentAngle;
    const value = (item.value / total) * 360;
    currentAngle += value;
    const endAngle = currentAngle;

    const x1 = 50 + 40 * Math.cos((Math.PI * startAngle) / 180);
    const y1 = 50 + 40 * Math.sin((Math.PI * startAngle) / 180);
    const x2 = 50 + 40 * Math.cos((Math.PI * endAngle) / 180);
    const y2 = 50 + 40 * Math.sin((Math.PI * endAngle) / 180);

    const largeArcFlag = value > 180 ? 1 : 0;

    const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    return {
      pathData,
      value: item.value,
      label: item.label,
      percentage: ((item.value / total) * 100).toFixed(1),
      color: colors[i % colors.length],
    };
  });

  return (
    <div
      className={cn("w-full flex flex-col items-center", className)}
      style={{ height }}
      {...props}
    >
      <div className="relative" style={{ width: height, height: height }}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full transform -rotate-90"
        >
          {/* Inner white circle for donut hole */}
          <circle cx="50" cy="50" r="25" fill="white" />
          
          {slices.map((slice, i) => (
            <path
              key={i}
              d={slice.pathData}
              className={cn(slice.color)}
              stroke="white"
              strokeWidth="1"
            />
          ))}
        </svg>
        
        {/* Center text showing total */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold">{total}</span>
          <span className="text-xs text-muted-foreground">Total</span>
        </div>
      </div>

      {showLabels && (
        <div className="mt-4 w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
          {slices.map((slice, i) => (
            <div key={i} className="flex items-center space-x-2">
              <div
                className={cn("w-3 h-3 rounded-full", slice.color.replace("fill-", "bg-"))}
              ></div>
              <span className="text-xs flex-1 truncate">{slice.label}</span>
              <span className="text-xs font-medium">{slice.percentage}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 