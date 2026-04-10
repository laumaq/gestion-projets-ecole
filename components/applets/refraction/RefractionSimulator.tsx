'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Laser } from './Laser';
import { Protractor } from './Protractor';
import { SliderZone } from './SliderZone';
import { LaserState, ProtractorState } from './types';

export const RefractionSimulator: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(1000);
  const [canvasHeight, setCanvasHeight] = useState(600);
  
  const [n1, setN1] = useState(1.0);
  const [n2, setN2] = useState(1.5);
  
  const [laserState, setLaserState] = useState<LaserState>({
    position: { x: 200, y: 200 },
    angle: Math.PI / 4,
    isOn: false,
    mode: 'move',
  });
  
  const [protractorState, setProtractorState] = useState<ProtractorState>({
    position: { x: 500, y: 300 },
    angle: 0,
    mode: 'move',
  });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setCanvasWidth(width);
        setCanvasHeight(600); // Hauteur fixe ou calculée
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Simulation de Réfraction
        </h1>
        
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div
            ref={containerRef}
            className="relative w-full"
            style={{ height: canvasHeight }}
          >
            {/* Zone supérieure avec couleur dynamique */}
            <div
              className="absolute left-0 right-0 transition-colors duration-200"
              style={{
                top: 0,
                height: '50%',
                backgroundColor: `rgb(${Math.round(255 - 55 * ((n1 - 1) / 1.5))}, ${Math.round(255 - 55 * ((n1 - 1) / 1.5))}, ${Math.round(200 + 55 * ((n1 - 1) / 1.5))})`,
              }}
            />
            
            {/* Zone inférieure avec couleur dynamique */}
            <div
              className="absolute left-0 right-0 transition-colors duration-200"
              style={{
                top: '50%',
                height: '50%',
                backgroundColor: `rgb(${Math.round(255 - 55 * ((n2 - 1) / 1.5))}, ${Math.round(255 - 55 * ((n2 - 1) / 1.5))}, ${Math.round(200 + 55 * ((n2 - 1) / 1.5))})`,
              }}
            />
            
            {/* Sliders */}
            <SliderZone
              label="n₁"
              value={n1}
              onChange={setN1}
              side="top"
            />
            
            <SliderZone
              label="n₂"
              value={n2}
              onChange={setN2}
              side="bottom"
            />
            
            {/* Dioptre */}
            <div
              className="absolute left-0 right-0 h-0.5 bg-black z-20"
              style={{ top: '50%' }}
            />
            
            {/* Normale */}
            <div
              className="absolute top-1/4 bottom-1/4 w-0.5 bg-gray-400 opacity-30 z-0"
              style={{ left: '50%', transform: 'translateX(-50%)' }}
            />
            
            {/* Rapporteur */}
            <Protractor
              state={protractorState}
              onPositionChange={(pos) => setProtractorState(prev => ({ ...prev, position: pos }))}
              onAngleChange={(angle) => setProtractorState(prev => ({ ...prev, angle }))}
              onModeChange={(mode) => setProtractorState(prev => ({ ...prev, mode }))}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
            />
            
            {/* Laser */}
            <Laser
              state={laserState}
              onPositionChange={(pos) => setLaserState(prev => ({ ...prev, position: pos }))}
              onAngleChange={(angle) => setLaserState(prev => ({ ...prev, angle }))}
              onToggle={() => setLaserState(prev => ({ ...prev, isOn: !prev.isOn }))}
              onModeChange={(mode) => setLaserState(prev => ({ ...prev, mode }))}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              n1={n1}
              n2={n2}
            />
          </div>
        </div>
      </div>
    </div>
  );
};