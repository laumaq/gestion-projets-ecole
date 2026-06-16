// app/globals.d.ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// Déclaration pour les imports CSS
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// Pour les imports CSS sans export (side-effect)
declare module '*.css' {
  const content: void;
  export default content;
}