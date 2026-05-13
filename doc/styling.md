# 🎨 Peechy Styling Guide

Design tokens are wired into **Tailwind v4** via `@theme` in `src/routes/layout.css`.
All tokens are available as Tailwind utility classes **and** as CSS custom properties.

---

## 📦 File Structure

```
src/
└── lib/
    └── styles/
        ├── colors.ts       # Color tokens (TypeScript)
        ├── typography.ts   # Font tokens + text-style presets (TypeScript)
        ├── spacing.ts      # Spacing scale (TypeScript)
        ├── radii.ts        # Border-radius scale (TypeScript)
        ├── tokens.css      # Raw CSS custom properties (:root)
        └── index.ts        # Barrel export

src/routes/
└── layout.css              # @import tailwindcss + @theme (Tailwind v4 config)
```

---

## 🌈 Colors

### Primary (Peach Brand)

| Utility class    | Hex       |
| ---------------- | --------- |
| `bg-primary-100` | `#FFE5DC` |
| `bg-primary-400` | `#FFB199` |
| `bg-primary-500` | `#FF9B73` |
| `bg-primary-600` | `#E87C5A` |

Works with any color utility: `bg-*`, `text-*`, `border-*`, `ring-*`, `fill-*`, `stroke-*`.

```svelte
<!-- ! Primary button -->
<button class="bg-primary-500 text-white hover:bg-primary-400 active:bg-primary-600">
	เริ่มเลย
</button>

<!-- ! Highlight background -->
<div class="rounded-lg border border-primary-400 bg-primary-100 p-md">...</div>
```

### Secondary (Support / Fun)

| Utility class         | Hex       | Meaning           |
| --------------------- | --------- | ----------------- |
| `bg-secondary-yellow` | `#FFD166` | Reward / Fun      |
| `bg-secondary-green`  | `#6BCB77` | Success / Correct |
| `bg-secondary-blue`   | `#4D96FF` | Info / Neutral    |

```svelte
<span class="rounded-sm bg-secondary-yellow px-sm py-xs text-gray-900">🏆 100 คะแนน</span>
```

### Neutral / Gray

| Utility class   | Hex       | Usage          |
| --------------- | --------- | -------------- |
| `text-gray-900` | `#1F2937` | Main text      |
| `text-gray-700` | `#4B5563` | Secondary text |
| `text-gray-400` | `#9CA3AF` | Disabled text  |
| `bg-gray-200`   | `#E5E7EB` | Border         |
| `bg-gray-100`   | `#F3F4F6` | Background     |

### Semantic

| Utility class | Hex       | Usage     |
| ------------- | --------- | --------- |
| `bg-success`  | `#6BCB77` | ตอบถูก    |
| `bg-error`    | `#FF6B6B` | ตอบผิด    |
| `bg-warning`  | `#FFD166` | แจ้งเตือน |
| `bg-info`     | `#4D96FF` | ข้อมูล    |

```svelte
<!-- ! Answer feedback -->
<div class="rounded-md bg-success p-md text-white">✅ ถูกต้อง!</div>
<div class="rounded-md bg-error p-md text-white">❌ ลองใหม่นะ</div>
```

---

## ✏️ Typography

### Font Families

| Utility     | Stack                                      |
| ----------- | ------------------------------------------ |
| `font-sans` | Noto Sans Thai → Inter → system sans-serif |
| `font-mono` | JetBrains Mono → Fira Code → monospace     |

> `font-sans` is the project default — Thai characters render correctly out of the box.

```svelte
<p class="font-sans text-gray-900">สวัสดีชาวโลก</p>
<code class="font-mono text-sm">const answer = 42;</code>
```

### Text Sizes (Tailwind defaults — unchanged)

The standard Tailwind scale (`text-xs` → `text-5xl`) works as-is because v4 ships with them.
The project's `typography.ts` presets map to these classes:

| Preset          | Tailwind class           | Size     | Weight |
| --------------- | ------------------------ | -------- | ------ |
| `displayLarge`  | `text-4xl font-bold`     | 2.25rem  | 700    |
| `displayMedium` | `text-3xl font-semibold` | 1.875rem | 600    |
| `titleLarge`    | `text-2xl font-semibold` | 1.5rem   | 600    |
| `titleMedium`   | `text-xl font-semibold`  | 1.25rem  | 600    |
| `bodyLarge`     | `text-lg font-normal`    | 1.125rem | 400    |
| `bodyMedium`    | `text-base font-normal`  | 1rem     | 400    |
| `bodySmall`     | `text-sm font-normal`    | 0.875rem | 400    |
| `labelLarge`    | `text-base font-medium`  | 1rem     | 500    |
| `labelMedium`   | `text-sm font-medium`    | 0.875rem | 500    |
| `labelSmall`    | `text-xs font-medium`    | 0.75rem  | 500    |

```svelte
<h1 class="font-sans text-4xl leading-tight font-bold text-gray-900">หัวข้อหลัก</h1>
<p class="font-sans text-base leading-normal font-normal text-gray-700">เนื้อหา</p>
<span class="font-sans text-xs font-medium text-gray-400">label เล็ก</span>
```

---

## 📐 Spacing

Named spacing tokens replace raw number classes (`p-4`, `m-6`, etc.) with semantic names.

| Utility | Value    | px  |
| ------- | -------- | --- |
| `p-2xs` | 0.125rem | 2   |
| `p-xs`  | 0.25rem  | 4   |
| `p-sm`  | 0.5rem   | 8   |
| `p-md`  | 1rem     | 16  |
| `p-lg`  | 1.5rem   | 24  |
| `p-xl`  | 2rem     | 32  |
| `p-2xl` | 3rem     | 48  |
| `p-3xl` | 4rem     | 64  |

Replace `p-` with any spacing utility: `m-`, `gap-`, `space-x-`, `w-`, `h-`, `inset-`, etc.

```svelte
<!-- ! Card -->
<div class="flex flex-col gap-md rounded-lg border border-gray-200 bg-white p-lg">
	<h2 class="text-xl font-semibold text-gray-900">Game Title</h2>
	<p class="mt-xs text-sm text-gray-700">คำอธิบาย</p>
	<button class="mt-md rounded-lg bg-primary-500 px-lg py-sm text-white"> เล่นเลย </button>
</div>
```

---

## 🔘 Border Radius

| Utility        | Value    | px  |
| -------------- | -------- | --- |
| `rounded-sm`   | 0.375rem | 6   |
| `rounded-md`   | 0.75rem  | 12  |
| `rounded-lg`   | 1rem     | 16  |
| `rounded-xl`   | 1.25rem  | 20  |
| `rounded-2xl`  | 1.5rem   | 24  |
| `rounded-full` | 9999px   | —   |

```svelte
<button class="rounded-lg bg-primary-500 px-lg py-sm text-white">ปุ่มใหญ่</button>
<img class="h-xl w-xl rounded-full object-cover" src="..." alt="avatar" />
<span class="rounded-sm bg-secondary-yellow px-xs py-2xs text-xs text-gray-900">Tag</span>
```

---

## 🔘 Button Patterns

### Primary Button

```svelte
<button
	class="rounded-lg bg-primary-500 px-lg py-sm font-medium text-white
         hover:bg-primary-400 focus-visible:ring-2
         focus-visible:ring-focus focus-visible:ring-offset-2
         active:bg-primary-600 disabled:cursor-not-allowed disabled:bg-btn-primary-disabled"
>
	เริ่มเลย
</button>
```

### Secondary Button

```svelte
<button
	class="rounded-lg border border-primary-500 bg-white px-lg py-sm font-medium text-primary-500
         hover:bg-primary-100 focus-visible:ring-2 focus-visible:ring-focus
         active:bg-primary-400 active:text-white"
>
	ยกเลิก
</button>
```

### Ghost Button

```svelte
<button
	class="rounded-lg bg-transparent px-lg py-sm font-medium text-primary-500
         hover:bg-primary-100
         focus-visible:ring-2 focus-visible:ring-focus"
>
	ดูเพิ่มเติม
</button>
```

---

## 🔵 Focus Ring

The global `:focus-visible` rule in `layout.css` applies the focus ring automatically.
For custom ring overrides in Tailwind:

```svelte
<input
	class="rounded-md border border-gray-200 px-md py-sm
         focus-visible:ring-2 focus-visible:ring-focus
         focus-visible:ring-offset-2 focus-visible:outline-none"
/>
```

---

## 💻 Using TypeScript Tokens in JS/TS Logic

Import from `$lib/styles` when you need token values in script logic (e.g. chart colors, canvas drawing, dynamic styles).

```ts
import { primary, semantic, spacing, radii } from '$lib/styles';

// Dynamic color for canvas / chart
ctx.fillStyle = primary[500]; // '#FF9B73'

// Dynamic inline style
const cardStyle = `border-radius: ${radii.lg}; padding: ${spacing.md};`;

// Semantic feedback color
const feedbackColor = isCorrect ? semantic.success : semantic.error;
```

---

## 🗂️ Using Raw CSS Variables

When Tailwind utilities cannot reach (e.g. inside `<style>` scoped blocks, complex pseudo-selectors):

```svelte
<style>
	.game-card {
		background-color: var(--color-primary-100);
		border-radius: var(--radii-lg);
		padding: var(--spacing-md);
	}

	.game-card:hover {
		background-color: var(--color-primary-500);
		color: var(--color-white);
	}
</style>
```

> CSS variables come from `src/lib/styles/tokens.css` which is already imported by `layout.css`.
