import React from 'react';
import { LaserState, Point } from './types';

interface LaserProps {
  state: LaserState;
  onPositionChange: (pos: Point) => void;
  onAngleChange: (angle: number) => void;
  onToggle: () => void;
  onModeChange: (mode: 'move' | 'rotate') => void;
  canvasWidth: number;
  canvasHeight: number;
  n1: number;
  n2: number;
}

export const Laser: React.FC<LaserProps> = ({
  state,
  onPositionChange,
  onAngleChange,
  onToggle,
  onModeChange,
  canvasWidth,
  canvasHeight,
  n1,
  n2,
}) => {
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startPos = { x: e.clientX, y: e.clientY };
    const startLaserPos = { ...state.position };
    const startAngle = state.angle;

    const handleDrag = (e: MouseEvent) => {
      if (state.mode === 'move') {
        const dx = e.clientX - startPos.x;
        const dy = e.clientY - startPos.y;
        onPositionChange({
          x: Math.max(50, Math.min(canvasWidth - 50, startLaserPos.x + dx)),
          y: Math.max(50, Math.min(canvasHeight - 50, startLaserPos.y + dy)),
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

  // Calculer le rayon réfracté
  const calculateRefractedRay = () => {
    const diopterY = canvasHeight / 2;
    const rayStart = state.position;
    
    // Direction du rayon incident (vecteur unitaire)
    const dirX = Math.cos(state.angle);
    const dirY = Math.sin(state.angle);
    
    // Déterminer si le rayon va vers le dioptre
    const isAboveDiopter = rayStart.y < diopterY;
    const goingTowardsDiopter = isAboveDiopter ? dirY > 0 : dirY < 0;
    
    if (!goingTowardsDiopter) return null;
    
    // Trouver l'intersection avec le dioptre (y = diopterY)
    const t = (diopterY - rayStart.y) / dirY;
    if (t <= 0) return null;
    
    const intersectionX = rayStart.x + t * dirX;
    
    // Vérifier que l'intersection est dans le canvas
    if (intersectionX < 0 || intersectionX > canvasWidth) return null;
    
    // Déterminer les indices de réfraction selon la position
    const incidentN = isAboveDiopter ? n1 : n2;
    const refractedN = isAboveDiopter ? n2 : n1;
    
    // Calculer l'angle d'incidence par rapport à la normale
    // Normale : verticale pointant vers le dioptre
    const normalAngle = isAboveDiopter ? Math.PI / 2 : -Math.PI / 2;
    const incidentAngle = state.angle - normalAngle;
    
    // Loi de Snell-Descartes
    const sinRefracted = (incidentN / refractedN) * Math.sin(incidentAngle);
    
    // Réflexion totale
    if (Math.abs(sinRefracted) > 1) {
      // La réflexion se fait DU MÊME CÔTÉ du dioptre
      // L'angle réfléchi = -angle incident (symétrique par rapport à la normale)
      const reflectedAngle = -normalAngle - incidentAngle;
      return {
        intersection: { x: intersectionX, y: diopterY },
        reflected: true,
        angle: reflectedAngle,
      };
    }
    
    // Réfraction normale (traverse le dioptre)
    const refractedAngle = Math.asin(sinRefracted) + normalAngle;
    
    return {
      intersection: { x: intersectionX, y: diopterY },
      reflected: false,
      angle: refractedAngle,
    };
  };

  const getRayEndPoint = (start: Point, angle: number, maxLength: number = 2000): Point => {
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    
    // Calculer les distances jusqu'aux bords
    let t = maxLength;
    
    if (dirX > 0) t = Math.min(t, (canvasWidth - start.x) / dirX);
    if (dirX < 0) t = Math.min(t, -start.x / dirX);
    if (dirY > 0) t = Math.min(t, (canvasHeight - start.y) / dirY);
    if (dirY < 0) t = Math.min(t, -start.y / dirY);
    
    return {
      x: start.x + dirX * t,
      y: start.y + dirY * t,
    };
  };

  const rayData = state.isOn ? calculateRefractedRay() : null;
  const rayEndPoint = rayData ? getRayEndPoint(rayData.intersection, rayData.angle) : null;

  return (
    <>
      {/* Rayon laser dessiné en arrière-plan */}
      {state.isOn && rayData && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: canvasWidth,
            height: canvasHeight,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {/* Rayon incident - du laser jusqu'au dioptre */}
          <line
            x1={state.position.x}
            y1={state.position.y}
            x2={rayData.intersection.x}
            y2={rayData.intersection.y}
            stroke="#ff0000"
            strokeWidth="2"
          />
          
          {/* Rayon réfracté/réfléchi - du dioptre vers le bas */}
          {rayData && rayEndPoint && (
            <line
              x1={rayData.intersection.x}
              y1={rayData.intersection.y}
              x2={rayEndPoint.x}
              y2={rayEndPoint.y}
              stroke={rayData.reflected ? "#ff0000" : "#ff0000"}
              strokeWidth="2"
              strokeDasharray={rayData.reflected ? "none" : "none"}
            />
          )}
        </svg>
      )}

      {/* Corps du laser */}
      <div
        style={{
          position: 'absolute',
          left: state.position.x,
          top: state.position.y,
          transform: `translate(-50%, -50%) rotate(${state.angle}rad)`,
          cursor: state.mode === 'move' ? 'move' : 'grab',
          zIndex: 20,
        }}
        onMouseDown={handleDragStart}
      >
        <div className="relative">
          {/* Icônes de contrôle */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2 bg-white rounded-lg shadow-lg p-1">
            <button
              onClick={() => onModeChange('move')}
              className={`p-1 rounded ${state.mode === 'move' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
              title="Déplacer"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2L8 4h1v3H6V6L4 8l2 2V9h3v3H8l2 2 2-2h-1v-3h3v1l2-2-2-2v1h-3V4h1z"/>
              </svg>
            </button>
            <button
              onClick={() => onModeChange('rotate')}
              className={`p-1 rounded ${state.mode === 'rotate' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
              title="Pivoter"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8h-2c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v3l4-4-4-4v3z"/>
              </svg>
            </button>
            <button
              onClick={onToggle}
              className={`p-1 rounded ${state.isOn ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
              title={state.isOn ? 'Éteindre' : 'Allumer'}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <circle cx="10" cy="10" r="4"/>
              </svg>
            </button>
          </div>

          {/* Corps du laser */}
          <div className="w-16 h-8 bg-gray-700 rounded-lg shadow-lg border-2 border-gray-600 relative">
            <div className={`absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${state.isOn ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
            <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-4 bg-gray-600 rounded-r" />
          </div>
        </div>
      </div>
    </>
  );
};