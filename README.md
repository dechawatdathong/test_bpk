# เวทีรับฟังความคิดเห็น ลุ่มน้ำบางปะกง — ฉบับรันเอง (Vercel / GitHub Pages)

เว็บนี้ใช้ **Firebase Firestore** (ฐานข้อมูลฟรีของ Google) แทนระบบเก็บข้อมูลของ Claude
เพื่อให้ทุกมือถือที่เปิดเว็บพร้อมกันเห็นผล Word Cloud และผลโหวตแบบเรียลไทม์เหมือนเดิม

## ขั้นที่ 1 — สร้างฐานข้อมูล Firebase (ทำครั้งเดียว, ฟรี)

1. ไปที่ https://console.firebase.google.com → **Add project** → ตั้งชื่อโปรเจกต์อะไรก็ได้
2. ในเมนูซ้าย ไป **Build → Firestore Database → Create database**
   - เลือก location ที่ใกล้ (เช่น asia-southeast1)
   - เลือกโหมด **Start in test mode** (ให้อ่าน/เขียนได้เลยโดยไม่ต้อง login — เหมาะกับงานเวิร์กช็อป)
3. กลับไปหน้า **Project settings** (รูปเฟือง) → เลื่อนลงหา **Your apps** → กด ไอคอน **Web `</>`**
   - ตั้งชื่อ app อะไรก็ได้ → กด Register app
   - จะได้ก้อนโค้ด `firebaseConfig = { apiKey: "...", ... }` — **คัดลอกทั้งก้อนนี้**

## ขั้นที่ 2 — แปะ config ลงไฟล์

เปิดไฟล์ `script.js` แล้วแทนที่ค่าตรงบรรทัดบนสุด (`const firebaseConfig = {...}`)
ด้วยค่าที่คัดลอกมาจากขั้นที่ 1 ให้ครบทุกฟิลด์

## ขั้นที่ 3 — (แนะนำ) ตั้งเวลาให้ฐานข้อมูลไม่ล็อกตัวเองหลัง 30 วัน

โหมด "test mode" จะหมดอายุใน 30 วันแล้วบล็อกการเขียนอัตโนมัติ
ไปที่ **Firestore Database → Rules** แล้ววางกฎนี้แทน (เหมาะกับงานสาธารณะที่ไม่ต้อง login):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /bangpakong/{docId} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ กฎนี้เปิดให้ใครก็ตามที่มีลิงก์เว็บอ่าน/เขียนข้อมูลได้ ซึ่งเหมาะกับ Word Cloud/Poll สาธารณะแบบนี้
> แต่ไม่ควรใช้กับข้อมูลที่ต้องการความเป็นส่วนตัว

## ขั้นที่ 4 — Deploy

### ตัวเลือก A: GitHub Pages
1. สร้าง repo ใหม่บน GitHub แล้วอัปโหลดไฟล์ `index.html`, `style.css`, `script.js` ขึ้นไป
2. ไปที่ repo → **Settings → Pages** → เลือก branch `main` โฟลเดอร์ `/root` → Save
3. รอสักครู่ จะได้ลิงก์ประมาณ `https://ชื่อบัญชี.github.io/ชื่อ repo/`

### ตัวเลือก B: Vercel
1. ไปที่ https://vercel.com → New Project
2. เลือก **Import** จาก GitHub repo เดียวกัน (หรือลาก-วางโฟลเดอร์นี้ผ่าน Vercel CLI: `vercel deploy`)
3. ไม่ต้องตั้งค่า build command ใด ๆ (เป็น static site ล้วน) → Deploy
4. จะได้ลิงก์ประมาณ `https://ชื่อโปรเจกต์.vercel.app`

เอาลิงก์ที่ได้ไปแชร์ให้ผู้เข้าร่วมเปิดจากมือถือได้เลย ข้อมูลจะซิงก์กันแบบเรียลไทม์ผ่าน Firebase
