# 🎨 Peechy Color Palette Design System

## 🧠 Brand Concept

- **Name:** Peechy 🍑
- **Mood:** Friendly, Fun, Warm, Educational
- **Tone:** Soft + Playful (ไม่แสบตา)
- **Target Users:** ครู + นักเรียน

---

# 🌈 Core Palette

## 1. Primary Colors (Peach Theme)

| Token         | Color     | Usage                |
| ------------- | --------- | -------------------- |
| `primary-500` | `#FF9B73` | สีหลักของแบรนด์      |
| `primary-400` | `#FFB199` | Hover / lighter      |
| `primary-600` | `#E87C5A` | Active / pressed     |
| `primary-100` | `#FFE5DC` | Background highlight |

**Usage:**

- ปุ่มหลัก (Primary Button)
- Highlight elements
- Game progress / reveal

---

## 2. Secondary Colors (Support / Fun)

| Token              | Color     | Usage             |
| ------------------ | --------- | ----------------- |
| `secondary-yellow` | `#FFD166` | Reward / ความสนุก |
| `secondary-green`  | `#6BCB77` | Success / ตอบถูก  |
| `secondary-blue`   | `#4D96FF` | Info / neutral    |

---

## 3. Neutral Colors (UI / Readability)

| Token      | Color     | Usage                   |
| ---------- | --------- | ----------------------- |
| `gray-900` | `#1F2937` | Main text               |
| `gray-700` | `#4B5563` | Secondary text          |
| `gray-400` | `#9CA3AF` | Disabled text           |
| `gray-200` | `#E5E7EB` | Border                  |
| `gray-100` | `#F3F4F6` | Background              |
| `white`    | `#FFFFFF` | Cards / main background |

---

# 🧩 Semantic Colors

| Type      | Color     | Usage     |
| --------- | --------- | --------- |
| `success` | `#6BCB77` | ตอบถูก    |
| `error`   | `#FF6B6B` | ตอบผิด    |
| `warning` | `#FFD166` | แจ้งเตือน |
| `info`    | `#4D96FF` | ข้อมูล    |

---

# 🔘 Button System

## Primary Button (Main CTA)

- Background: `primary-500`
- Text: `#FFFFFF`

**States:**

- Hover: `primary-400`
- Active: `primary-600`
- Disabled: `#FFD8CC`

---

## Secondary Button

- Background: `#FFFFFF`
- Border: `primary-500`
- Text: `primary-500`

**States:**

- Hover: `primary-100`
- Active: `primary-400`

---

## Ghost Button

- Background: `transparent`
- Text: `primary-500`

**States:**

- Hover: `primary-100`

---

# ✨ Focus & Interaction

## Focus Ring

- Color: `#FFB199`
- Style: `2px solid`
- Offset: `2px`

```css
:focus {
	outline: 2px solid #ffb199;
	outline-offset: 2px;
}
```
