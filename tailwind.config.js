/** @type {import('tailwindcss').Config} */
// Design system: Starbucks (ตาม DESIGN.md)
// - Four-tier green: Starbucks / Accent / House / Uplift แต่ละเฉดมีบทบาทของตัวเอง
// - พื้นหลังเป็นครีมอุ่น (#f2f0eb) ไม่ใช่ขาวล้วน
// - ทอง (#cba258) สงวนไว้สำหรับ "ช่วงเวลาสำคัญ" เท่านั้น ไม่ใช้เป็นสีตกแต่งทั่วไป
// - ปุ่มทุกตัวเป็น full-pill 50px, การ์ด 12px
// หมายเหตุ: ตัด darkMode ออกแล้ว ระบบนี้เป็น light-only ตามสเปก
module.exports = {
  content: ['./index.html', './js/**/*.js'],
  theme: {
    extend: {
      colors: {
        /* ---- Four-tier green ---- */
        'starbucks-green': '#006241', // หัวข้อหลัก / brand signal
        'green-accent': '#00754A',    // ปุ่ม CTA และปุ่มลอย (Frap)
        'house-green': '#1E3932',     // แถบเข้ม / พื้นผิวลึก
        'green-uplift': '#2b5148',    // เขียวรองสำหรับงานตกแต่ง
        'green-light': '#d4e9e2',     // เขียวอ่อนสำหรับพื้นอ่อน

        /* ---- Gold: สงวนไว้เฉพาะช่วงเวลาสำคัญ ---- */
        gold: {
          DEFAULT: '#cba258',
          light: '#dfc49d',
          lightest: '#faf6ee',
        },

        /* ---- Surface ---- */
        'neutral-cool': '#f9f9f9',
        'neutral-warm': '#f2f0eb', // พื้นหลังหลักของหน้า (ครีม)
        ceramic: '#edebe9',        // ครีมเข้มขึ้นเล็กน้อย ใช้คั่นโซน
        hairline: '#e7e7e7',
        'input-border': '#d6dbde',

        /* ---- Text ---- */
        ink: 'rgba(0, 0, 0, 0.87)',        // ตัวอักษรหลัก (ไม่ใช่ดำสนิท)
        'ink-soft': 'rgba(0, 0, 0, 0.58)', // ตัวอักษรรอง
        'ink-on-dark': 'rgba(255, 255, 255, 1)',
        'ink-on-dark-soft': 'rgba(255, 255, 255, 0.70)',

        /* ---- Semantic สำหรับแอปการเงิน ---- */
        income: '#00754A',   // เงินเข้า = Green Accent
        expense: '#c82014',  // เงินออก = Red ในระบบ
        transfer: '#cba258', // โอนย้าย = Gold
        warn: '#fbbc05',

        /* ---- สีหมวดหมู่: โทนมิวต์ที่เข้ากับพื้นครีม ----
           แต่ละชุดมี bg (พื้นอ่อน) / fg (ตัวอักษรเข้ม) / bd (เส้นขอบ) */
        cat: {
          clay:     { bg: '#f7ece5', fg: '#9c5729', bd: '#e8d3c2' },
          espresso: { bg: '#f2ebe4', fg: '#6f4e37', bd: '#ded0c0' },
          moss:     { bg: '#eef1e6', fg: '#5c6b34', bd: '#d6dfc4' },
          denim:    { bg: '#e9eef4', fg: '#35566f', bd: '#c8d7e4' },
          azure:    { bg: '#e7f0f4', fg: '#2c6079', bd: '#c4dbe5' },
          plum:     { bg: '#efeaf3', fg: '#5f4478', bd: '#dbcde6' },
          honey:    { bg: '#f8f0dd', fg: '#8a6414', bd: '#ecdcb4' },
          lavender: { bg: '#eeecf6', fg: '#56508c', bd: '#d7d3ea' },
          rosewood: { bg: '#f7eaee', fg: '#97405a', bd: '#e9ccd5' },
          grape:    { bg: '#f0eaf4', fg: '#6a4283', bd: '#ddcbe7' },
          lagoon:   { bg: '#e6f1ef', fg: '#1f6360', bd: '#c3dedb' },
          blush:    { bg: '#f9ebe8', fg: '#a25243', bd: '#eed3cc' },
          brick:    { bg: '#f8eae8', fg: '#a3352a', bd: '#eecdc8' },
          fern:     { bg: '#e8f1e8', fg: '#35663c', bd: '#c9e0cb' },
          orchid:   { bg: '#f6eaf1', fg: '#8c3f6d', bd: '#e7ccdc' },
          pine:     { bg: '#e7f0ec', fg: '#1f5f47', bd: '#c6ded3' },
          sage:     { bg: '#ecf1ec', fg: '#4a6650', bd: '#d2dfd5' },
          steel:    { bg: '#eceff1', fg: '#4b5b66', bd: '#d3dae0' },
          taupe:    { bg: '#f2efe9', fg: '#6b6055', bd: '#ded7cb' },
          pebble:   { bg: '#f0eeeb', fg: '#5f5952', bd: '#ddd8d1' },
        },
      },

      /* ปุ่มเป็น full-pill ทุกตัว การ์ด 12px ช่องกรอก 4px */
      borderRadius: {
        xs: '4px',
        card: '12px',
        pill: '50px',
      },

      fontFamily: {
        // SoDoSans เป็นฟอนต์เฉพาะของ Starbucks ใช้ไม่ได้สาธารณะ
        // และต้องรองรับภาษาไทย จึงคง Sarabun ไว้เป็นตัวหลัก
        sans: ['Sarabun', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },

      letterSpacing: {
        brand: '-0.16px', // tracking แน่นตามระบบ
      },

      boxShadow: {
        card: '0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)',
        nav: '0 1px 3px rgba(0,0,0,0.1), 0 2px 2px rgba(0,0,0,0.06), 0 0 2px rgba(0,0,0,0.07)',
        frap: '0 0 6px rgba(0,0,0,0.24), 0 8px 12px rgba(0,0,0,0.14)',
        'frap-active': '0 0 6px rgba(0,0,0,0.24), 0 8px 12px rgba(0,0,0,0)',
      },
    },
  },
  plugins: [],
};
