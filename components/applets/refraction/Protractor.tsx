import React from 'react';
import { ProtractorState, Point } from './types';

interface ProtractorProps {
  state: ProtractorState;
  onPositionChange: (pos: Point) => void;
  onAngleChange: (angle: number) => void;
  onModeChange: (mode: 'move' | 'rotate') => void;
  canvasWidth: number;
  canvasHeight: number;
}

export const Protractor: React.FC<ProtractorProps> = ({
  state,
  onPositionChange,
  onAngleChange,
  onModeChange,
  canvasWidth,
  canvasHeight,
}) => {
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startPos = { x: e.clientX, y: e.clientY };
    const startProtractorPos = { ...state.position };
    const startAngle = state.angle;

    const handleDrag = (e: MouseEvent) => {
      if (state.mode === 'move') {
        const dx = e.clientX - startPos.x;
        const dy = e.clientY - startPos.y;
        onPositionChange({
          x: Math.max(size/2, Math.min(canvasWidth - size/2, startProtractorPos.x + dx)),
          y: Math.max(size/2, Math.min(canvasHeight - size/2, startProtractorPos.y + dy)),
        });
      } else {
        const center = state.position;
        const currentAngle = Math.atan2(e.clientY - center.y, e.clientX - center.x);
        const startMouseAngle = Math.atan2(startPos.y - center.y, startPos.x - center.x);
        const deltaAngle = currentAngle - startMouseAngle;
        onAngleChange(startAngle + deltaAngle);
      }
    };

    const handleDragEnd = () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
    };

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const size = 400;

  return (
    <div
      style={{
        position: 'absolute',
        left: state.position.x - size/2,
        top: state.position.y - size/2,
        transform: `rotate(${state.angle}rad)`,
        transformOrigin: `${size/2}px ${size/2}px`,
        cursor: state.mode === 'move' ? 'move' : 'grab',
        pointerEvents: 'auto',
        zIndex: 5,
      }}
      onMouseDown={handleDragStart}
    >
      <div className="relative">
        {/* Icônes de contrôle */}
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex gap-2 bg-white rounded-lg shadow-lg p-1 z-30">
          <button
            onClick={() => onModeChange('move')}
            className={`p-1.5 rounded ${state.mode === 'move' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
            title="Déplacer"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2L8 4h1v3H6V6L4 8l2 2V9h3v3H8l2 2 2-2h-1v-3h3v1l2-2-2-2v1h-3V4h1z"/>
            </svg>
          </button>
          <button
            onClick={() => onModeChange('rotate')}
            className={`p-1.5 rounded ${state.mode === 'rotate' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
            title="Pivoter"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8h-2c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v3l4-4-4-4v3z"/>
            </svg>
          </button>
        </div>

        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="opacity-90">
          {/* Cercle extérieur */}
          <circle
            cx={size/2}
            cy={size/2}
            r={size/2 - 10}
            fill="rgba(255, 255, 255, 0.95)"
            stroke="#333"
            strokeWidth="2"
          />
          
          {/* Ligne horizontale (0° - 180°) */}
          <line 
            x1={10} 
            y1={size/2} 
            x2={size - 10} 
            y2={size/2} 
            stroke="#333" 
            strokeWidth="2" 
          />
          
          {/* Ligne verticale (90° - 270°) */}
          <line 
            x1={size/2} 
            y1={10} 
            x2={size/2} 
            y2={size - 10} 
            stroke="#333" 
            strokeWidth="1" 
            strokeDasharray="4,4" 
          />
          
          {/* Centre */}
          <circle cx={size/2} cy={size/2} r="5" fill="#333" />
          <circle cx={size/2} cy={size/2} r="2" fill="white" />
          
          {/* Graduations du demi-cercle supérieur (0° à 180°, sens horaire) */}
          {Array.from({ length: 181 }).map((_, i) => {
            const angleDeg = i;
            const angleRad = (angleDeg * Math.PI) / 180;
            
            const outerRadius = size/2 - 10;
            let innerRadius;
            let strokeWidth = 1;
            
            if (i % 90 === 0) {
              innerRadius = size/2 - 45;
              strokeWidth = 3;
            } else if (i % 10 === 0) {
              innerRadius = size/2 - 35;
              strokeWidth = 2.5;
            } else if (i % 5 === 0) {
              innerRadius = size/2 - 28;
              strokeWidth = 1.5;
            } else {
              innerRadius = size/2 - 23;
              strokeWidth = 0.8;
            }
            
            const x1 = size/2 + outerRadius * Math.cos(angleRad);
            const y1 = size/2 + outerRadius * Math.sin(angleRad);
            const x2 = size/2 + innerRadius * Math.cos(angleRad);
            const y2 = size/2 + innerRadius * Math.sin(angleRad);
            
            return (
              <g key={`top-${i}`}>
                <line 
                  x1={x1} 
                  y1={y1} 
                  x2={x2} 
                  y2={y2} 
                  stroke="#333" 
                  strokeWidth={strokeWidth} 
                />
                {i % 10 === 0 && (
                  <text
                    x={size/2 + (outerRadius - 55) * Math.cos(angleRad)}
                    y={size/2 + (outerRadius - 55) * Math.sin(angleRad) + 5}
                    fontSize={i % 90 === 0 ? "14" : "11"}
                    fontWeight={i % 90 === 0 ? "bold" : "normal"}
                    textAnchor="middle"
                    fill="#333"
                  >
                    {angleDeg}°
                  </text>
                )}
              </g>
            );
          })}
          
          {/* Graduations du demi-cercle inférieur (0° à 180°, sens horaire aussi) */}
          {Array.from({ length: 181 }).map((_, i) => {
            const angleDeg = i;
            const angleRad = (angleDeg * Math.PI) / 180 + Math.PI; // Décalage de 180°
            
            const outerRadius = size/2 - 10;
            let innerRadius;
            let strokeWidth = 1;
            
            if (i % 90 === 0) {
              innerRadius = size/2 - 45;
              strokeWidth = 3;
            } else if (i % 10 === 0) {
              innerRadius = size/2 - 35;
              strokeWidth = 2.5;
            } else if (i % 5 === 0) {
              innerRadius = size/2 - 28;
              strokeWidth = 1.5;
            } else {
              innerRadius = size/2 - 23;
              strokeWidth = 0.8;
            }
            
            const x1 = size/2 + outerRadius * Math.cos(angleRad);
            const y1 = size/2 + outerRadius * Math.sin(angleRad);
            const x2 = size/2 + innerRadius * Math.cos(angleRad);
            const y2 = size/2 + innerRadius * Math.sin(angleRad);
            
            return (
              <g key={`bottom-${i}`}>
                <line 
                  x1={x1} 
                  y1={y1} 
                  x2={x2} 
                  y2={y2} 
                  stroke="#333" 
                  strokeWidth={strokeWidth} 
                />
                {i % 10 === 0 && (
                  <text
                    x={size/2 + (outerRadius - 55) * Math.cos(angleRad)}
                    y={size/2 + (outerRadius - 55) * Math.sin(angleRad) + 5}
                    fontSize={i % 90 === 0 ? "14" : "11"}
                    fontWeight={i % 90 === 0 ? "bold" : "normal"}
                    textAnchor="middle"
                    fill="#666"
                  >
                    {angleDeg}°
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};