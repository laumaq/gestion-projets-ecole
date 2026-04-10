import React from 'react';

interface SliderZoneProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  side: 'top' | 'bottom';
}

export const SliderZone: React.FC<SliderZoneProps> = ({
  label,
  value,
  onChange,
  side,
}) => {
  // Calculer la couleur de fond : blanc (1) à bleu (2.5)
  const getBackgroundColor = () => {
    const intensity = (value - 1) / 1.5; // 0 à 1
    const blue = Math.round(200 + 55 * intensity);
    const white = Math.round(255 - 55 * intensity);
    return `rgb(${white}, ${white}, ${blue})`;
  };

  return (
    <div
      className="absolute right-8 flex items-center gap-3 z-30"
      style={{
        top: side === 'top' ? 'calc(50% - 80px)' : 'calc(50% + 30px)',
      }}
    >
      <span className="text-sl font-medium text-gray-800 w-5">{label}</span>
      <input
        type="range"
        min="1"
        max="2.5"
        step="0.3"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-32 h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
        style={{
          background: `linear-gradient(to right, rgb(255,255,255), rgb(200,200,255))`,
        }}
      />
      <span className="text-sm font-medium text-gray-700 w-12">{value.toFixed(1)}</span>
    </div>
  );
};