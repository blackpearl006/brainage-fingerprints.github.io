export const palette = {
  paper:  "#FAF7F2",
  paper2: "#F0EDE5",
  ink:    "#1A2332",
  ink2:   "#5A6478",
  sig:    "#C8312B",
  shell:  "#8898AA",
  accent: "#E89B2C",
};

export const networkColors = {
  "Default":           "#CD3E3E",
  "Frontoparietal":    "#E9A528",
  "Dorsal Attention":  "#008080",
  "Ventral Attention": "#A050A0",
  "Somatomotor":       "#4682B4",
  "Visual":            "#9ACD32",
  "Limbic":            "#D4956A",
  "NA":                "#AAAAAA",
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function rgbToHex(r, g, b) {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// t in [0,1] → hex colour (paper cream → warm orange → sig red)
export function sequentialColor(t) {
  const stops = [
    hexToRgb("#F0EDE5"),  // paper2
    hexToRgb("#E89B2C"),  // accent orange
    hexToRgb("#C8312B"),  // sig red
  ];
  const s = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(Math.floor(s), stops.length - 2);
  const f = s - i;
  const [r1, g1, b1] = stops[i];
  const [r2, g2, b2] = stops[i + 1];
  return rgbToHex(
    Math.round(r1 + (r2 - r1) * f),
    Math.round(g1 + (g2 - g1) * f),
    Math.round(b1 + (b2 - b1) * f),
  );
}
