# Manga Translation Tool

A web-based tool for translating manga pages using OCR and AI.

## Features
- **Upload Image**: Load your manga page.
- **Selection Tool**: Drag to select text boxes.
- **OCR**: Automatically extracts text using Tesseract.js.
- **AI Translation**: Connects to OpenRouter (supports Gemini, GPT, etc.) to translate Japanese to Thai.
- **Editing & Styling**: Edit text, change font size, color, stroke, and rotation.
- **Inpainting**: Simple background patch to hide original text.

## How to Run
Due to browser security restrictions (CORS) related to Web Workers (used by Tesseract.js), **you should run this project on a local web server** rather than opening `index.html` directly.

### Option 1: Using Python (Recommended)
If you have Python installed:
1. Open a terminal/command prompt in this folder.
2. Run:
   ```bash
   python -m http.server 8000
   ```
3. Open your browser and go to `http://localhost:8000`.

### Option 2: Using VS Code Live Server
If you use VS Code, install the "Live Server" extension and click "Go Live".

## Usage
1. **Enter API Key**: Put your OpenRouter API Key in the settings panel (needed for translation).
2. **Upload**: Select a manga image.
3. **Select Text**: Click and drag to draw a box around Japanese text.
4. **Wait**: The status will show "Scanning..." then "Translating...".
5. **Edit**: Adjust the text and styles in the side panel.
6. **Refine**: You can drag the box (delete and redraw for now, or I'll add move support later) or just adjust styles.
