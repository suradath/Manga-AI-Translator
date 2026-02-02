# Manga Translator Tool (เครื่องมือแปลมังงะ)

[English Version](#english-version) | [เวอร์ชันภาษาไทย](#thai-version)

---

<a name="english-version"></a>
## English Version

**Manga Translator Tool** is a web-based application (and Chrome Extension) designed to help you translate manga or comic pages easily using AI and OCR technology.

### Key Features

*   **Image Processing:** Upload manga pages directly or use it as a Chrome Extension.
*   **OCR (Optical Character Recognition):**
    *   Powered by **Tesseract.js** running locally in your browser.
    *   Supports multiple languages: Japanese, English, Chinese (Simplified/Traditional), and Korean.
*   **AI Translation:**
    *   Supports major AI providers: **OpenRouter** (Recommended), **Google Gemini API**, **DeepSeek**, and **OpenAI**.
    *   Customizable API Key and Model selection.
    *   **Auto Translate:** Automatically translates text after selecting an area.
*   **Free Translation Services:**
    *   Includes unofficial free web APIs: **Google Translate (GTX)**, **MyMemory**, and **SimplyTranslate AI**.
    *   **Smart Text Processing:** Automatically removes newlines to form proper sentences before translating, improving translation quality.
*   **Editor & Canvas:**
    *   Draw boxes around text bubbles to translate.
    *   Edit original text (OCR results) and translated text manually.
    *   **Inpainting:** Automatically fills the background of text bubbles (simple color fill).
    *   **Text Rendering:** Renders translated text back onto the image with customizable fonts and styles.
    *   **Save Image:** Download the translated manga page.

### Installation & Usage

1.  **Clone or Download** this repository.
2.  **Web Version:** Open `index.html` in your browser.
3.  **Chrome Extension:**
    *   Go to `chrome://extensions/`.
    *   Enable **Developer mode**.
    *   Click **Load unpacked** and select the project folder.
    *   Pin the extension and click the icon to open the tool.

---

<a name="thai-version"></a>
## เวอร์ชันภาษาไทย

**เครื่องมือแปลมังงะ (Manga Translator Tool)** คือเว็บแอปพลิเคชัน (และส่วนขยาย Chrome) ที่ช่วยให้คุณแปลหน้ามังงะหรือการ์ตูนได้อย่างง่ายดายด้วยเทคโนโลยี AI และ OCR

### คุณสมบัติเด่น (Features)

*   **จัดการรูปภาพ:** อัปโหลดหน้ามังงะเพื่อเริ่มแปล หรือใช้งานผ่าน Chrome Extension
*   **OCR (แปลงภาพเป็นข้อความ):**
    *   ใช้ **Tesseract.js** ทำงานในเบราว์เซอร์ของคุณโดยตรง (ไม่ต้องอัปโหลดภาพไปเซิร์ฟเวอร์อื่นเพื่อทำ OCR)
    *   รองรับหลายภาษา: ญี่ปุ่น, อังกฤษ, จีน (ตัวย่อ/ตัวเต็ม), และเกาหลี
*   **AI แปลภาษา:**
    *   รองรับผู้ให้บริการชั้นนำ: **OpenRouter** (แนะนำ), **Google Gemini API**, **DeepSeek**, และ **OpenAI**
    *   สามารถใส่ API Key และเลือกโมเดลที่ต้องการได้เอง
    *   **แปลอัตโนมัติ (Auto Translate):** แปลทันทีเมื่อลากกล่องครอบข้อความเสร็จ
*   **บริการแปลฟรี:**
    *   มีตัวเลือกแปลฟรีผ่าน Web APIs (Unofficial): **Google Translate (GTX)**, **MyMemory**, และ **SimplyTranslate AI**
    *   **จัดรูปแบบข้อความอัจฉริยะ:** ระบบจะตัดการขึ้นบรรทัดใหม่ (Newlines) ออกให้เป็นประโยคยาวๆ ก่อนส่งแปล เพื่อให้ได้ความหมายที่ถูกต้องและอ่านรู้เรื่องมากขึ้น
*   **เครื่องมือแก้ไข:**
    *   ลากกล่องครอบบอลลูนข้อความเพื่อแปล
    *   แก้ไขข้อความต้นฉบับ (ผลลัพธ์จาก OCR) และข้อความที่แปลแล้วได้
    *   **ลบข้อความเดิม (Inpainting):** ถมสีพื้นหลังกล่องข้อความให้อัตโนมัติ (แบบง่าย)
    *   **แสดงผลข้อความ:** วาดข้อความที่แปลทับลงบนภาพ พร้อมปรับแต่งฟอนต์และสไตล์ได้
    *   **บันทึกรูปภาพ:** ดาวน์โหลดภาพมังงะที่แปลเสร็จแล้วเก็บไว้ได้

### การติดตั้งและใช้งาน

1.  **ดาวน์โหลด** โปรเจกต์นี้
2.  **ใช้งานผ่านเว็บ:** เปิดไฟล์ `index.html` ในเบราว์เซอร์
3.  **ใช้งานเป็น Chrome Extension:**
    *   ไปที่ `chrome://extensions/` ใน Chrome
    *   เปิด **Developer mode (โหมดนักพัฒนาซอฟต์แวร์)** ที่มุมขวาบน
    *   กด **Load unpacked (โหลดส่วนขยายที่ยังไม่ได้แพ็ก)** และเลือกโฟลเดอร์โปรเจกต์นี้
    *   กดไอคอนส่วนขยายเพื่อเปิดใช้งาน
