// ============================================================
// CRM THEME — X Travel Group
// Sistema de diseno centralizado estilo Zoho CRM
// Importar en todos los modulos: import { Z, ZC, ZBtn, ZBadge, ZTable, ZModal, ZCard, ZInp, ZSel } from "./crm-theme.js";
// ============================================================

// Paleta de colores — Zoho style
export var Z = {
  // Superficies
  bg:       "#f4f5f7",
  surface:  "#ffffff",
  surfaceHover: "#f9fafb",
  sidebar:  "#ffffff",
  topbar:   "#ffffff",

  // Bordes
  border:   "#e3e6ea",
  borderL:  "#edf0f3",
  divider:  "#f0f2f5",

  // Texto
  t1:  "#1a1f2e",   // titulos, labels fuertes
  t2:  "#3d4554",   // texto principal
  t3:  "#6b7280",   // secundario
  t4:  "#9ca3af",   // placeholder, muted
  t5:  "#c4c9d4",   // muy sutil

  // Brand — azul marino X Travel Group
  brand:    "#1a385a",
  brandMid: "#2e5c8a",
  brandLt:  "#e8edf5",
  brandBd:  "#b8c8dc",

  // Acento Zoho — azul claro para links y acciones
  accent:   "#1565c0",
  accentBg: "#e8f0fe",
  accentBd: "#aac4f0",

  // Semaforo — SOLO donde agrega informacion
  green:    "#1e7e34",
  greenBg:  "#edf7ee",
  greenBd:  "#a3d9a5",

  amber:    "#92600a",
  amberBg:  "#fef9e7",
  amberBd:  "#f0d080",

  red:      "#b91c1c",
  redBg:    "#fef2f2",
  redBd:    "#f5b8b8",

  blue:     "#1565c0",
  blueBg:   "#e8f0fe",
  blueBd:   "#aac4f0",

  purple:   "#5b21b6",
  purpleBg: "#ede9fe",
  purpleBd: "#c4b5fd",

  // Tipografia
  font: "'DM Sans', 'Segoe UI', -apple-system, sans-serif",
  fontSm: "'DM Sans', 'Segoe UI', -apple-system, sans-serif",

  // Sombras
  shadowSm: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
  shadowLg: "0 8px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04)",

  // Radios
  r1: "4px",
  r2: "6px",
  r3: "8px",
  r4: "10px",
};

// ── Estilos de componentes base (funciones) ───────────────────

// Input style
export function ZInpStyle(err) {
  return {
    width: "100%",
    padding: "7px 10px",
    border: "1px solid " + (err ? Z.red : Z.border),
    borderRadius: Z.r2,
    fontSize: "13px",
    color: Z.t2,
    background: Z.surface,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: Z.font,
    transition: "border-color 0.15s",
    lineHeight: "1.4",
  };
}

// Label style
export function ZLblStyle() {
  return {
    fontSize: "12px",
    fontWeight: "500",
    color: Z.t3,
    marginBottom: "5px",
    display: "block",
    letterSpacing: "0.01em",
  };
}

// Card style
export function ZCardStyle(extra) {
  return Object.assign({
    background: Z.surface,
    border: "1px solid " + Z.border,
    borderRadius: Z.r3,
    boxShadow: Z.shadowSm,
  }, extra || {});
}

// Tabla header cell
export function ZThStyle() {
  return {
    padding: "8px 12px",
    fontSize: "11px",
    fontWeight: "600",
    color: Z.t3,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    background: "#f8f9fb",
    borderBottom: "2px solid " + Z.border,
    whiteSpace: "nowrap",
  };
}

// Tabla body cell
export function ZTdStyle(idx) {
  return {
    padding: "9px 12px",
    fontSize: "13px",
    color: Z.t2,
    borderBottom: "1px solid " + Z.borderL,
    background: idx % 2 === 0 ? Z.surface : "#fafbfc",
    verticalAlign: "middle",
  };
}

// Badge estilos por tipo
export var ZBadgeStyles = {
  default:   {color:Z.t3,     bg:"#f3f4f6",   bd:Z.border},
  brand:     {color:Z.brand,  bg:Z.brandLt,   bd:Z.brandBd},
  accent:    {color:Z.accent, bg:Z.accentBg,  bd:Z.accentBd},
  green:     {color:Z.green,  bg:Z.greenBg,   bd:Z.greenBd},
  amber:     {color:Z.amber,  bg:Z.amberBg,   bd:Z.amberBd},
  red:       {color:Z.red,    bg:Z.redBg,     bd:Z.redBd},
  blue:      {color:Z.blue,   bg:Z.blueBg,    bd:Z.blueBd},
  purple:    {color:Z.purple, bg:Z.purpleBg,  bd:Z.purpleBd},
  // Status especificos
  activo:    {color:Z.green,  bg:Z.greenBg,   bd:Z.greenBd},
  inactivo:  {color:Z.t4,     bg:"#f3f4f6",   bd:Z.border},
  pendiente: {color:Z.amber,  bg:Z.amberBg,   bd:Z.amberBd},
  confirmado:{color:Z.blue,   bg:Z.blueBg,    bd:Z.blueBd},
  pagado:    {color:Z.green,  bg:Z.greenBg,   bd:Z.greenBd},
  ordenado:  {color:Z.brand,  bg:Z.brandLt,   bd:Z.brandBd},
  cancelado: {color:Z.red,    bg:Z.redBg,     bd:Z.redBd},
  completado:{color:Z.green,  bg:Z.greenBg,   bd:Z.greenBd},
  rechazado: {color:Z.red,    bg:Z.redBg,     bd:Z.redBd},
  aprobado:  {color:Z.green,  bg:Z.greenBg,   bd:Z.greenBd},
  proceso:   {color:Z.blue,   bg:Z.blueBg,    bd:Z.blueBd},
};

// Btn variantes
export var ZBtnStyles = {
  primary: {
    background: Z.brand,
    color: "#fff",
    border: "1px solid " + Z.brand,
  },
  secondary: {
    background: Z.surface,
    color: Z.t2,
    border: "1px solid " + Z.border,
  },
  accent: {
    background: Z.accent,
    color: "#fff",
    border: "1px solid " + Z.accent,
  },
  danger: {
    background: Z.surface,
    color: Z.red,
    border: "1px solid " + Z.redBd,
  },
  ghost: {
    background: "transparent",
    color: Z.t3,
    border: "1px solid transparent",
  },
  success: {
    background: Z.surface,
    color: Z.green,
    border: "1px solid " + Z.greenBd,
  },
};

export function ZBtnStyle(v, sm) {
  var s = ZBtnStyles[v] || ZBtnStyles.secondary;
  return Object.assign({}, s, {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: sm ? "4px 10px" : "7px 14px",
    borderRadius: Z.r2,
    cursor: "pointer",
    fontSize: sm ? "11px" : "12px",
    fontWeight: "500",
    fontFamily: Z.font,
    whiteSpace: "nowrap",
    transition: "all 0.12s",
    lineHeight: "1.4",
  });
}

// Modal overlay + box
export var ZModalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(10,15,25,0.45)",
  zIndex: 200,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
};

export function ZModalBox(maxW) {
  return {
    background: Z.surface,
    borderRadius: Z.r4,
    width: "100%",
    maxWidth: maxW || "540px",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: Z.shadowLg,
    border: "1px solid " + Z.border,
  };
}

// Modal header
export var ZModalHeader = {
  padding: "14px 18px",
  borderBottom: "1px solid " + Z.border,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#f8f9fb",
  borderRadius: "10px 10px 0 0",
};

// Section divider dentro de modal/form
export function ZDividerStyle() {
  return {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    margin: "16px 0 12px",
  };
}

// KPI card
export function ZKpiStyle(color) {
  return {
    background: Z.surface,
    border: "1px solid " + Z.border,
    borderRadius: Z.r3,
    padding: "14px 16px",
    boxShadow: Z.shadowSm,
    borderTop: "2px solid " + (color || Z.brand),
  };
}

// Tab button
export function ZTabStyle(active) {
  return {
    padding: "9px 14px",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid " + (active ? Z.brand : "transparent"),
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: active ? "600" : "400",
    color: active ? Z.brand : Z.t3,
    fontFamily: Z.font,
    whiteSpace: "nowrap",
    transition: "all 0.12s",
  };
}

// Sidebar nav item
export function ZNavItemStyle(active) {
  return {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "7px 10px",
    borderRadius: Z.r2,
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: active ? "600" : "400",
    color: active ? Z.brand : Z.t2,
    background: active ? Z.brandLt : "transparent",
    transition: "all 0.12s",
    userSelect: "none",
  };
}

// Wrap general de modulo
export var ZModuleWrap = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  fontFamily: "'DM Sans', 'Segoe UI', -apple-system, sans-serif",
  background: Z.bg,
  color: Z.t2,
  fontSize: "13px",
};

// Topbar del modulo
export var ZModuleTopbar = {
  background: Z.surface,
  borderBottom: "1px solid " + Z.border,
  padding: "0 20px",
  display: "flex",
  alignItems: "center",
  minHeight: "48px",
  flexShrink: 0,
  gap: "12px",
};

// Body scrollable del modulo
export var ZModuleBody = {
  flex: 1,
  overflowY: "auto",
  padding: "16px 20px",
};

// ── Constantes de color por rol ───────────────────────────────
export var ZRolMeta = {
  admin:       {label:"Admin",        color:Z.brand,  bg:Z.brandLt,  bd:Z.brandBd},
  director:    {label:"Director",     color:Z.accent, bg:Z.accentBg, bd:Z.accentBd},
  supervisor:  {label:"Supervisor",   color:Z.purple, bg:Z.purpleBg, bd:Z.purpleBd},
  verificador: {label:"Verificador",  color:Z.blue,   bg:Z.blueBg,   bd:Z.blueBd},
  vendedor:    {label:"Vendedor",     color:Z.green,  bg:Z.greenBg,  bd:Z.greenBd},
  cs:          {label:"CS",           color:Z.amber,  bg:Z.amberBg,  bd:Z.amberBd},
};
