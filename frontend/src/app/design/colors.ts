/**
 * Paleta de colores de CoachLab
 * Colores principales y secundarios para toda la aplicación
 */

export const COLORS = {
  // Colores primarios
  primary: '#10B981', // Verde principal
  primaryLight: '#0ECF7E',
  primaryDark: '#0EA572',
  primaryTransparent: 'rgba(16,185,129,0.1)',
  primaryTransparent15: 'rgba(16,185,129,0.15)',
  primaryTransparent20: 'rgba(16,185,129,0.2)',
  primaryTransparent32: 'rgba(16,185,129,0.32)',

  // Colores secundarios
  secondary: '#00E676', // Verde claro

  // Fondos
  background: '#0B0E14', // Negro profundo
  backgroundCard: '#151A23', // Gris oscuro
  backgroundBar: '#0F1318', // Gris muy oscuro

  // Bordes
  borderLight: 'rgba(42,49,60,0.6)', // Borde translúcido claro
  borderDark: '#2A313C', // Borde oscuro
  borderDarkTransparent: 'rgba(42,49,60,0.4)', // Borde oscuro translúcido

  // Textos
  textPrimary: '#F8FAFC', // Blanco principal
  textSecondary: '#94A3B8', // Gris claro
  textTertiary: '#64748B', // Gris medio
  textQuaternary: '#475569', // Gris oscuro
  textMuted: '#334155', // Gris muy oscuro

  // Colores funcionales
  accent: '#10B981', // Verde (mismo que primary)
  success: '#10B981',
  warning: '#FACC15',
  danger: '#EF4444',

  // Colores de racha
  win: '#10B981', // Verde para victoria
  draw: '#FACC15', // Amarillo para empate
  loss: '#EF4444', // Rojo para derrota

  // Gradientes
  gradientGreen: 'linear-gradient(90deg, #10B981, #00E676)',
  gradientGreenFade: 'linear-gradient(90deg,#10B981,#00E676,transparent)',
  gradients: {
    primary: 'linear-gradient(90deg, #10B981, #00E676)',
    fade: 'linear-gradient(90deg,#10B981,#00E676,transparent)',
    greenToPrimary: 'linear-gradient(90deg, #10B981, #00E676)',
  },

  // Fondos translúcidos
  glowGreen: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 68%)',
  glowGreenWeak: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',

  // Estados
  hover: {
    borderColor: '#10B981',
    textColor: '#F8FAFC',
  },
};

// Tipos de colores para TypeScript
export type ColorKey = keyof typeof COLORS;
export type ColorValue = typeof COLORS[ColorKey];

