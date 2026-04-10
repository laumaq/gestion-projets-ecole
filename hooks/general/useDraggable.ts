import { useState, useCallback, useEffect } from 'react';

interface UseDraggableProps {
  initialPosition: { x: number; y: number };
  onPositionChange?: (pos: { x: number; y: number }) => void;
  mode?: 'move' | 'rotate';
  initialAngle?: number;
  onAngleChange?: (angle: number) => void;
}

export function useDraggable({
  initialPosition,
  onPositionChange,
  mode = 'move',
  initialAngle = 0,
  onAngleChange,
}: UseDraggableProps) {
  const [position, setPosition] = useState(initialPosition);
  const [angle, setAngle] = useState(initialAngle);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentMode, setCurrentMode] = useState<'move' | 'rotate'>(mode);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    e.stopPropagation();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    if (currentMode === 'move') {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      const newPosition = {
        x: position.x + dx,
        y: position.y + dy,
      };
      
      setPosition(newPosition);
      onPositionChange?.(newPosition);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else {
      // Mode rotation
      const center = position;
      const currentAngle = Math.atan2(e.clientY - center.y, e.clientX - center.x);
      const startAngle = Math.atan2(dragStart.y - center.y, dragStart.x - center.x);
      const deltaAngle = currentAngle - startAngle;
      
      const newAngle = angle + deltaAngle;
      setAngle(newAngle);
      onAngleChange?.(newAngle);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, currentMode, position, angle, dragStart, onPositionChange, onAngleChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    position,
    angle,
    isDragging,
    currentMode,
    setCurrentMode,
    handleMouseDown,
    setPosition,
  };
}