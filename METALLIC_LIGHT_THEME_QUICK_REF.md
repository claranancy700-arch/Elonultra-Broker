# Metallic Light Theme - Quick Reference

## Visual Effects Summary

### 🎨 Color Scheme
```
Background:  Linear gradient (Light Blue → White → Light Blue)
Text:        Dark Gray (#1f2937)
Accent:      Crimson Red (#e63946)
Highlight:   Bright Red (#ff4757)
```

### ✨ Effects Applied

#### 1. **Cards & Containers**
```
Effect: Metallic Glass Look
├─ Background: Semi-transparent white gradient
├─ Shadows: Inset (top highlight + bottom depth)
├─ Border: Subtle blue-gray with opacity
└─ Hover: Lift + Shadow enhancement + Red glow
```

#### 2. **Buttons**
```
Effect: Polished Metal
├─ Shadow: Multi-layer (outer glow + inset depth)
├─ Animation: Shine sweep on hover
├─ Effect: Light reflects across button
└─ Interaction: Smooth scale & color shift
```

#### 3. **Form Elements (Input/TextArea/Select)**
```
Effect: Brushed Metal Input
├─ Background: Subtle gradient
├─ Border: Blue-gray with reduced opacity
├─ Inset Shadow: Recessed appearance
└─ Focus: Color ring + Enhanced shadow
```

#### 4. **Tables**
```
Effect: Gradient Rows
├─ Header: Metallic gradient background
├─ Body Rows: Smooth hover gradient
├─ Hover Effect: Soft inner glow
└─ Border: Soft opacity-based borders
```

#### 5. **Navigation**
```
Effect: Floating Header
├─ Top Light Line: Subtle accent gradient
├─ Sidebar: Inset edge shadow
├─ Active Links: Color gradient + inset indicator
└─ Hover: Smooth background gradient
```

## Animation List

| Name | Target | Duration | Effect |
|------|--------|----------|--------|
| `shine` | Buttons | 0.5s | Light sweep left→right |
| `subtle-float` | Card Values | 3s | Gentle up-down bounce |
| `slideInUp` | Cards/Tables | 0.6s | Entrance from below |
| All hover | Elements | 0.3s | Smooth transition |

## Shadow Layers Breakdown

### Multi-Layer Shadow Example (Button)
```css
box-shadow:
  0 4px 12px rgba(230, 57, 70, 0.25),    /* Outer red glow */
  inset 0 1px 0 rgba(255, 255, 255, 0.3),  /* Top highlight */
  inset 0 -1px 0 rgba(180, 30, 40, 0.2);   /* Bottom depth */
```

### Multi-Layer Shadow Example (Card)
```css
box-shadow:
  0 4px 12px rgba(0, 0, 0, 0.08),         /* Soft outer shadow */
  inset 0 1px 0 rgba(255, 255, 255, 0.8),  /* Top shine line */
  inset 0 -1px 0 rgba(208, 214, 233, 0.3); /* Bottom dimension */
```

## Gradient Examples

### Background Gradient
```css
linear-gradient(135deg, #f8f9ff 0%, #ffffff 50%, #f0f4ff 100%)
```

### Button Gradient
```css
.btn {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%);
}
```

### Hover Effect Gradient
```css
background: linear-gradient(90deg, rgba(230, 57, 70, 0.08) 0%, transparent 100%);
```

## Interactive Features

### Shine Effect (On Button Hover)
- Horizontal gradient bar sweeps left to right
- Creates reflection of light on metallic surface
- Smooth 0.5s transition

### Float Animation (Card Numbers)
- Subtle 2px movement up and down
- 3-second loop, continuous
- Makes values feel alive

### Depth on Interaction
- Inset shadows expand on hover
- Outer shadow intensifies
- Color becomes more saturated
- Overall: Element "pops" from surface

## Browser Support
✅ Chrome/Edge 88+
✅ Firefox 87+
✅ Safari 14+
✅ All modern browsers with CSS3 support

## File Locations

- **Main CSS**: [css/styles.css](css/styles.css) (Lines: 1-1067)
- **Frontend CSS**: [frontend/public/css/styles.css](frontend/public/css/styles.css)
- **Theme Switcher**: [js/theme-switcher.js](js/theme-switcher.js)
- **Documentation**: [METALLIC_LIGHT_THEME.md](METALLIC_LIGHT_THEME.md)

## Toggle Light Theme

Click the theme switcher button (☀️/🌙) in the top-right corner or floating toggle to enable the metallic light theme.

## CSS Variable Reference

```css
html[data-theme="light"] {
  --bg-solid: #ffffff;
  --card-solid: #f8f9fa;
  --border: #e5e7eb;
  --muted: #6b7280;
  --text: #1f2937;
  --accent: #e63946;
  --accent-light: #ff4757;
  --metallic-light: #f0f4ff;
  --metallic-mid: #d5dce9;
  --metallic-dark: #a8b8d8;
}
```

---
**Theme Version**: 2.0 (Metallic Dynamic)
**Last Updated**: February 5, 2026
