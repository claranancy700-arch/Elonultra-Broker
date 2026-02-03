# Dark & Light Theme Color Palettes - Elon U React

## Dark Theme (Purple to Red Gradient)

### Primary Colors
- **Background**: `#1a0f2e` (Deep Purple)
- **Card/Surface**: `#2d1b47` (Purple)
- **Border**: `#3d2a5a` (Darker Purple)

### Accent Colors
- **Primary Accent**: `#e84d5c` (Crimson Red) - Used for buttons, links, highlights
- **Light Accent**: `#f08070` (Coral/Salmon) - Used for hover states, secondary highlights
- **Muted Accent**: `#a84b7c` (Mauve/Rose) - Used for subtle elements

### Text Colors
- **Primary Text**: `#f1f5f9` (White)
- **Muted Text**: `#9a8fb5` (Light Purple/Gray)

---

## Light Theme (Yellow to Red Gradient)

### Primary Colors
- **Background**: `#ffffff` (White)
- **Card/Surface**: `#f8f9fa` (Light Gray)
- **Border**: `#e5e7eb` (Gray)

### Accent Colors
- **Primary Accent**: `#e63946` (Red/Crimson) - Used for buttons, links, highlights
- **Light Accent**: `#ff4757` (Bright Red) - Used for hover states, secondary highlights
- **Muted Accent**: `#ffa850` (Orange/Peach) - Used for subtle elements

### Text Colors
- **Primary Text**: `#1f2937` (Dark Gray)
- **Muted Text**: `#6b7280` (Medium Gray)

### Special Colors
- **Warning**: `#ffdb00` (Bright Yellow)

---

## Complete CSS Variables

### Dark Theme
```css
:root {
  --bg: #1a0f2e;           /* Deep purple background */
  --card: #2d1b47;         /* Purple card surface */
  --border: #3d2a5a;       /* Dark purple borders */
  --muted: #9a8fb5;        /* Light purple text */
  --text: #f1f5f9;         /* White text */
  --accent: #e84d5c;       /* Crimson red accent */
  --accent-light: #f08070; /* Coral/salmon accent */
  --accent-muted: #a84b7c; /* Mauve/rose accent */
  --success: #10b981;      /* Green */
  --danger: #ef4444;       /* Red */
  --warn: #f08070;         /* Coral warning */
}
```

### Light Theme
```css
html[data-theme="light"] {
  --bg: #ffffff;           /* White background */
  --card: #f8f9fa;         /* Light gray card surface */
  --border: #e5e7eb;       /* Light gray borders */
  --muted: #6b7280;        /* Medium gray text */
  --text: #1f2937;         /* Dark gray text */
  --accent: #e63946;       /* Red/crimson accent */
  --accent-light: #ff4757; /* Bright red accent */
  --accent-muted: #ffa850; /* Orange/peach accent */
  --success: #10b981;      /* Green */
  --danger: #ef4444;       /* Red */
  --warn: #ffdb00;         /* Yellow warning */
}
```

---

## Theme Implementation

### Theme Toggle
- Location: `frontend/src/components/layout/Header.jsx`
- Button: "☀️ Light Mode" / "🌙 Dark Mode"
- Persists to localStorage
- Applies `data-theme="dark"` or `data-theme="light"` to `<html>`

### Theme Initialization
- Location: `frontend/src/main.jsx`
- Loads saved theme from localStorage on app startup
- Defaults to dark theme if not saved

### CSS Files with Theme Support
1. `frontend/src/index.css` - React app theme variables
2. `css/styles.css` - Legacy HTML pages theme variables

## Components Using New Colors

- **Header** - Gradient background, brand text gradient
- **Bottom Navigation** - Accent colors for icons and active states
- **Cards** - Card background with borders
- **Buttons** - Primary accent color with hover states
- **Links** - Muted text with accent on hover
- **Forms** - Card backgrounds, border colors
- **Tables** - Alternating row colors, accent highlights

## Smooth Transitions

All color changes are animated with:
```css
transition: var(--transition);
/* all 0.3s cubic-bezier(0.4, 0, 0.2, 1) */
```

## Testing the Theme

1. Navigate to http://localhost:5174
2. Click "☀️ Light Mode" button in header to toggle theme
3. Refresh page - theme persists from localStorage
4. All components should smoothly transition colors

---

**Dark Theme Palette**: Purple (#5A3A7F) → Mauve (#A84B7C) → Red (#E84D5C) → Coral (#F08070)  
**Light Theme Palette**: Yellow (#FFDB00) → Orange (#FFA850) → Red (#E63946) → Bright Red (#FF4757)
