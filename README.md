# MintTracker — ระบบบันทึกรายรับ-รายจ่าย (PWA)

แอปบันทึกรายรับ-รายจ่ายส่วนบุคคล ทำงานออฟไลน์ได้เต็มรูปแบบ ติดตั้งลงหน้าจอโฮมได้
ข้อมูลทั้งหมดเก็บอยู่ในเครื่องผู้ใช้ (localStorage) ไม่มีเซิร์ฟเวอร์หลังบ้าน

## โครงสร้างไฟล์

```
index.html               หน้าเว็บหลัก (มาร์กอัปอย่างเดียว)
css/tailwind.css         Tailwind ที่ precompile แล้ว (ไฟล์สร้างอัตโนมัติ - ห้ามแก้มือ)
css/style.css            สไตล์ที่เขียนเอง (โหลดหลัง tailwind.css เพื่อให้ override ได้)
js/app.js                ตรรกะแอปทั้งหมด
js/sw-register.js        ลงทะเบียน Service Worker + แบนเนอร์แจ้งเวอร์ชันใหม่
manifest.webmanifest     ข้อมูลแอปสำหรับติดตั้ง (ชื่อ ไอคอน ธีม)
sw.js                    Service Worker (แคชไฟล์เพื่อใช้งานออฟไลน์)
assets/                  ไลบรารีและฟอนต์ทั้งหมดเก็บในเครื่อง (ไม่พึ่ง CDN)
tailwind.config.js       ตั้งค่า Tailwind สำหรับตอน build
src/tailwind-input.css   ไฟล์ตั้งต้นของ Tailwind (@tailwind directives)
package.json             สคริปต์ build CSS
.nojekyll                บอก GitHub Pages ไม่ต้องประมวลผลด้วย Jekyll
```

## Build CSS (ทำเมื่อแก้ class ใน HTML/JS)

`css/tailwind.css` เป็นไฟล์ที่ **สร้างจากการสแกน class ใน `index.html` และ `js/**/*.js`**
ถ้าเพิ่ม/แก้ class ใหม่ ต้อง build ใหม่ ไม่งั้น class นั้นจะไม่มีสไตล์:

```bash
npm install          # ครั้งแรกเท่านั้น
npm run build:css    # หรือ npm run watch:css ระหว่างพัฒนา
```

ไม่อยากติดตั้ง? ใช้คำสั่งเดียวจบได้เลย:

```bash
npx tailwindcss@3 -c tailwind.config.js -i src/tailwind-input.css -o css/tailwind.css --minify
```

## รันบนเครื่อง (ทดสอบ)

ดับเบิลคลิก `start-app.bat` หรือสั่ง:

```bash
python -m http.server 8000
```

แล้วเปิด <http://localhost:8000/>

> ⚠️ ต้องเปิดผ่าน http/https เท่านั้น — เปิดไฟล์ตรงๆ แบบ `file://` จะไม่มี Service Worker
> (ออฟไลน์และการติดตั้งเป็นแอปจะไม่ทำงาน)

## Deploy ขึ้น GitHub Pages

> โค้ดจะเป็นสาธารณะ แต่ **ข้อมูลการเงินของคุณไม่ถูกอัปขึ้นไป** เพราะเก็บอยู่ใน
> localStorage บนเครื่องผู้ใช้เท่านั้น ไม่มีข้อมูลใดอยู่ในไฟล์โปรเจกต์

### ครั้งแรก (ทำครั้งเดียว)

```bash
gh auth login                 # ล็อกอิน GitHub (เลือก HTTPS + เปิดเบราว์เซอร์)

git init
git add .
git commit -m "MintTracker PWA"
git branch -M main

# สร้าง repo สาธารณะแล้ว push ขึ้นไปในคำสั่งเดียว
gh repo create minttracker --public --source=. --push

# เปิด GitHub Pages ให้เสิร์ฟจาก branch main
gh api -X POST repos/{owner}/minttracker/pages -f "source[branch]=main" -f "source[path]=/"
```

รอ 1-2 นาที แล้วเปิด `https://<username>.github.io/minttracker/`

### อัปเดตครั้งต่อไป

```bash
npm run build:css     # เฉพาะเมื่อแก้ class ใน HTML/JS
# อย่าลืมเพิ่มเลขเวอร์ชันใน sw.js ด้วย
git add .
git commit -m "อธิบายสิ่งที่แก้"
git push
```

เนื่องจากทุก path ในโปรเจกต์เป็น **relative** ทั้งหมด จึงใช้ได้ทั้งแบบ
`https://<username>.github.io/<repo>/` และโดเมนของตัวเอง โดยไม่ต้องแก้อะไรเพิ่ม

## ติดตั้งลงหน้าจอโฮม

หลัง deploy ขึ้น HTTPS แล้ว เปิด URL บนมือถือ:

- **Android (Chrome):** เมนู ⋮ → *ติดตั้งแอป* / *เพิ่มไปยังหน้าจอโฮม*
- **iPhone (Safari):** ปุ่มแชร์ → *เพิ่มไปยังหน้าจอโฮม*

เปิดครั้งแรกให้ต่อเน็ตหนึ่งครั้งเพื่อให้ Service Worker แคชไฟล์ หลังจากนั้นใช้งานออฟไลน์ได้เลย

## สำรองข้อมูล

ข้อมูลอยู่ใน localStorage ของเบราว์เซอร์เท่านั้น **ควรกด "สำรองข้อมูล (Export)"
ในแท็บตั้งค่าเป็นระยะ** แล้วเก็บไฟล์ `.json` ไว้นอกเครื่อง (LINE / อีเมล / Drive)
โดยเฉพาะบน iOS ที่อาจล้างข้อมูลเว็บอัตโนมัติหากไม่ได้เปิดแอปนาน

## เวลาแก้ไฟล์ (สำคัญ)

ทำ 2 อย่างนี้ทุกครั้ง มิฉะนั้นผู้ใช้เดิมจะยังได้ของเก่า:

1. ถ้าแก้ class ใน HTML/JS → **build CSS ใหม่** (`npm run build:css`)
2. **เพิ่มเลขเวอร์ชันใน `sw.js`** (เช่น `minttracker-v5` → `minttracker-v6`)

### ผู้ใช้จะได้เวอร์ชันใหม่อย่างไร

Service Worker ตัวใหม่จะ**ไม่ยึดอำนาจทันที** แต่จะรออยู่ แล้วแอปจะขึ้นแบนเนอร์
*"มีเวอร์ชันใหม่พร้อมใช้งาน"* ให้ผู้ใช้กดปุ่ม **อัปเดต** เอง จากนั้นหน้าจะรีเฟรชให้อัตโนมัติ

ออกแบบแบบนี้เพราะถ้าอัปเดตทันทีโดยไม่ถาม หน้าที่เปิดอยู่จะรัน JS เก่าปนกับไฟล์ใหม่
และผู้ใช้ที่กำลังกรอกรายการค้างอยู่อาจโดนรีเฟรชจนข้อมูลที่พิมพ์หาย
