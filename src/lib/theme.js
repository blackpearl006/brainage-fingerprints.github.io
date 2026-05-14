export const palette = {
  paper:  "#FAF7F2",
  paper2: "#F0EDE5",
  ink:    "#1A2332",
  ink2:   "#5A6478",
  sig:    "#C8312B",
  shell:  "#8898AA",
  accent: "#E89B2C",
};

// 7-network + subcortical colour map
export const networkColors = {
  "Default":           "#D64040",  // red
  "Frontoparietal":    "#E9A528",  // amber
  "Dorsal Attention":  "#2A9E8F",  // teal
  "Ventral Attention": "#9B59B6",  // purple
  "Somatomotor":       "#3A7EC6",  // blue
  "Visual":            "#5DAD43",  // green
  "Limbic":            "#D4956A",  // warm tan
  // Subcortical (from Our_20network fallback)
  "AmyHip":            "#8B6F97",  // muted purple — amygdala + hippocampus
  "Striatum":          "#5B8C5A",  // muted green — basal ganglia
  "Thalamus":          "#5B85A4",  // steel blue — thalamus
  "AudLang":           "#E07B54",  // orange — auditory/language
  "Subcortical":       "#7A8FA6",  // slate — catch-all
  "NA":                "#9AAABB",  // light grey
};

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbToHex(r, g, b) {
  return `#${Math.round(r).toString(16).padStart(2,"0")}${Math.round(g).toString(16).padStart(2,"0")}${Math.round(b).toString(16).padStart(2,"0")}`;
}

// t in [0,1] → hex colour (paper → amber → sig red)
export function sequentialColor(t) {
  const stops = [
    hexToRgb("#F0EDE5"),  // paper cream (0)
    hexToRgb("#E89B2C"),  // accent amber (0.5)
    hexToRgb("#C8312B"),  // sig red (1)
  ];
  const s = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(Math.floor(s), stops.length - 2);
  const f = s - i;
  const [r1, g1, b1] = stops[i];
  const [r2, g2, b2] = stops[i + 1];
  return rgbToHex(r1 + (r2 - r1) * f, g1 + (g2 - g1) * f, b1 + (b2 - b1) * f);
}
