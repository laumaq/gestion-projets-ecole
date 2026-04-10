export interface Point {
  x: number;
  y: number;
}

export interface LaserState {
  position: Point;
  angle: number; // en radians
  isOn: boolean;
  mode: 'move' | 'rotate';
}

export interface ProtractorState {
  position: Point;
  angle: number; // en radians
  mode: 'move' | 'rotate';
}

export interface RefractionState {
  n1: number;
  n2: number;
}