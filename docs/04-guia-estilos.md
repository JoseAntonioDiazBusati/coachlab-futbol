# 4. Style Guide and Prototyping

## 4.1 Design Approach

CoachLab does not have a Figma prototype. The visual design was developed directly in code using SCSS design tokens, iterating progressively as components were built. This approach — sometimes called "design in the browser" — allowed for rapid feedback cycles and ensured that the implemented design matched the final product exactly.

## 4.2 Colour Palette

The design uses a dark theme with green accent colours, consistent with the visual language of sports analytics dashboards.

### Primary Colours

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#0d1117` | Main background |
| `--color-surface` | `#161b22` | Card and panel background |
| `--color-surface-2` | `#1c2333` | Elevated surfaces, inputs |
| `--color-border` | `#30363d` | Borders and dividers |
| `--color-accent` | `#2ea043` | Primary action, highlights |
| `--color-accent-hover` | `#3fb950` | Hover state for accent elements |
| `--color-accent-muted` | `rgba(46,160,67,0.15)` | Accent backgrounds, badges |

### Text Colours

| Token | Value | Usage |
|---|---|---|
| `--color-text` | `#e6edf3` | Primary body text |
| `--color-text-muted` | `#8b949e` | Secondary text, labels |
| `--color-text-faint` | `#484f58` | Placeholder text, disabled |

### Semantic Colours

| Token | Value | Usage |
|---|---|---|
| `--color-success` | `#2ea043` | Wins, positive results |
| `--color-warning` | `#d29922` | Draws, warnings |
| `--color-danger` | `#f85149` | Losses, errors |
| `--color-info` | `#388bfd` | Information, links |

## 4.3 Typography

### Font Families

| Token | Family | Source |
|---|---|---|
| `--font-display` | Outfit | Google Fonts |
| `--font-body` | Inter | Google Fonts |
| `--font-mono` | system-ui monospace stack | System |

**Outfit** is used for headings, KPI numbers, and brand elements. Its geometric, modern letterforms convey a sports-tech aesthetic.

**Inter** is used for body text, labels, and interface copy. It is optimised for screen readability at small sizes.

### Type Scale

| Token | Size | Weight | Usage |
|---|---|---|---|
| `--text-xs` | 0.75rem | 400 | Captions, badges |
| `--text-sm` | 0.875rem | 400 | Secondary labels |
| `--text-base` | 1rem | 400 | Body copy |
| `--text-lg` | 1.125rem | 600 | Subheadings |
| `--text-xl` | 1.25rem | 600 | Section headings |
| `--text-2xl` | 1.5rem | 700 | Page titles |
| `--text-3xl` | 1.875rem | 700 | KPI values |
| `--text-4xl` | 2.25rem | 800 | Hero headings |

## 4.4 Spacing System

CoachLab uses an 8-point spacing grid. All spacing values are multiples of 4px or 8px.

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Tight internal padding |
| `--space-2` | 8px | Small gaps |
| `--space-3` | 12px | Form element padding |
| `--space-4` | 16px | Standard padding |
| `--space-6` | 24px | Card padding |
| `--space-8` | 32px | Section spacing |
| `--space-12` | 48px | Large section gaps |
| `--space-16` | 64px | Page-level spacing |

## 4.5 Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 4px | Badges, small chips |
| `--radius-md` | 8px | Buttons, inputs |
| `--radius-lg` | 12px | Cards |
| `--radius-xl` | 16px | Panels, modals |
| `--radius-full` | 9999px | Pills, avatars |

## 4.6 Reusable Components

### Button — Primary

```scss
.btn-primary {
  background: var(--color-accent);
  color: #fff;
  border: none;
  padding: var(--space-2) var(--space-6);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover { background: var(--color-accent-hover); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}
```

### Button — Outline

```scss
.btn-outline {
  background: transparent;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  padding: var(--space-2) var(--space-6);
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;

  &:hover {
    border-color: var(--color-text-muted);
    color: var(--color-text);
  }
}
```

### KPI Card

The KPI card is a core display component used on the dashboard. It shows a metric label, a large value, and an optional trend indicator.

```html
<div class="kpi-card">
  <span class="kpi-label">Wins</span>
  <span class="kpi-value">12</span>
  <span class="kpi-sub">of 18 matches</span>
</div>
```

### Result Badge

Used to display match results inline.

```scss
// Applied via class: .badge-victoria, .badge-empate, .badge-derrota
.badge-victoria { background: var(--color-accent-muted); color: var(--color-success); }
.badge-empate   { background: rgba(210,153,34,0.15);     color: var(--color-warning); }
.badge-derrota  { background: rgba(248,81,73,0.15);      color: var(--color-danger);  }
```

### Form Field

```scss
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);

  label { font-size: var(--text-sm); color: var(--color-text-muted); font-weight: 500; }

  input, select {
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-base);

    &:focus {
      outline: none;
      border-color: var(--color-accent);
    }
  }
}
```
