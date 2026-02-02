const canvas = document.getElementById('mangaCanvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('imageUpload');
const originalTextEl = document.getElementById('originalText');
const translatedTextEl = document.getElementById('translatedText');
const selectionPanel = document.getElementById('selectionInfo');
const ocrStatusEl = document.getElementById('ocrStatus');

// State
let img = new Image();
let boxes = []; // { id, x, y, w, h, original, translated, style: {...}, patch: boolean }
let activeBoxId = null;
let isDrawing = false;
let isDraggingBox = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let startX = 0;
let startY = 0;
let currentSelection = null; // {x, y, w, h} while dragging
let ocrWorker = null; // Reusable Tesseract Worker
let currentOcrLang = 'jpn';

// Default Style Settings
let currentStyle = {
    fontFamily: 'Arial',
    fontSize: 20,
    color: '#000000',
    strokeWidth: 2,
    strokeColor: '#ffffff',
    rotation: 0,
    bold: false,
    italic: false,
    align: 'center'
};

// Settings Elements
const fontSizeInput = document.getElementById('fontSize');
const fontFamilyInput = document.getElementById('fontFamily');
const colorInput = document.getElementById('textColor');
const strokeInput = document.getElementById('textStroke');
const strokeColorInput = document.getElementById('strokeColor');
const rotationInput = document.getElementById('textRotation');
const rotationVal = document.getElementById('rotationVal');
const patchInput = document.getElementById('enablePatch');
const apiKeyInput = document.getElementById('apiKey');
const saveApiBtn = document.getElementById('saveApiBtn');
const modelSelect = document.getElementById('modelSelect');
const providerSelect = document.getElementById('providerSelect');
const ocrLangSelect = document.getElementById('ocrLang');
const autoTranslateToggle = document.getElementById('autoTranslateToggle');
const freeTranslateBtn = document.getElementById('freeTranslateBtn');
const freeServiceSelect = document.getElementById('freeService');

const apiKeyStatusEl = document.getElementById('apiKeyStatus');

// API Configuration
const API_PROVIDERS = {
    openrouter: {
        name: "OpenRouter",
        url: "https://openrouter.ai/api/v1/chat/completions",
        format: "openai",
        placeholder: "sk-or-...",
        models: [] // Will be populated dynamically
    },
    google: {
        name: "Google Gemini",
        url: "https://generativelanguage.googleapis.com/v1beta/models/",
        format: "google",
        placeholder: "AIzaSy...",
        models: [
            { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash (Latest)" },
            { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Stable)" },
            { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" }
        ]
    },
    deepseek: {
        name: "DeepSeek",
        url: "https://api.deepseek.com/chat/completions",
        format: "openai",
        placeholder: "sk-...",
        models: [
            { id: "deepseek-chat", name: "DeepSeek Chat (V3)" },
            { id: "deepseek-reasoner", name: "DeepSeek Reasoner (R1)" }
        ]
    },
    openai: {
        name: "OpenAI",
        url: "https://api.openai.com/v1/chat/completions",
        format: "openai",
        placeholder: "sk-...",
        models: [
            { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
            { id: "gpt-4o", name: "GPT-4o" },
            { id: "gpt-4o-mini", name: "GPT-4o Mini" }
        ]
    }
};

// Initialize
async function init() {
    // Load Saved Settings
    const savedProvider = localStorage.getItem('manga_provider');
    const savedKey = localStorage.getItem('manga_api_key');
    
    if (savedProvider) {
        providerSelect.value = savedProvider;
    }
    if (savedKey) {
        apiKeyInput.value = savedKey;
        updateApiStatus(true, 'Saved');
    } else {
        updateApiStatus(false, 'Not Saved');
    }

    const savedAutoTranslate = localStorage.getItem('manga_auto_translate');
    if (savedAutoTranslate !== null) {
        autoTranslateToggle.checked = savedAutoTranslate === 'true';
    }

    updateModelList();
    canvas.width = 800;
    canvas.height = 600;
    ctx.fillStyle = "#ccc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "20px Arial";
    ctx.fillStyle = "#555";
    ctx.textAlign = "center";
    ctx.fillText("อัปโหลดรูปภาพเพื่อเริ่ม", canvas.width/2, canvas.height/2);

    // Initialize OCR Worker
    await updateOCRWorker();
}

async function updateOCRWorker() {
    const lang = ocrLangSelect.value;
    if (ocrWorker && currentOcrLang === lang) return;

    ocrStatusEl.textContent = `กำลังโหลดภาษา OCR (${lang})...`;
    
    // Disable inputs while loading
    ocrLangSelect.disabled = true;
    
    try {
        if (typeof Tesseract !== 'undefined') {
            if (ocrWorker) {
                await ocrWorker.terminate();
                ocrWorker = null;
            }
            // Use local worker and core for Chrome Extension compatibility
            let workerPath = 'lib/worker.min.js';
            let corePath = 'lib/tesseract-core.wasm.js';

            // Check if running in Chrome Extension environment
            try {
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
                    workerPath = chrome.runtime.getURL('lib/worker.min.js');
                    corePath = chrome.runtime.getURL('lib/tesseract-core.wasm.js');
                }
            } catch (err) {
                console.warn("Could not get chrome.runtime.getURL:", err);
            }

            // Tesseract.js v5 createWorker returns a worker instance directly
            ocrWorker = await Tesseract.createWorker(lang, 1, {
                workerPath: workerPath,
                corePath: corePath,
                workerBlobURL: false,
                logger: m => console.log(m)
            });
            currentOcrLang = lang;
            ocrStatusEl.textContent = "OCR พร้อมใช้งาน";
        } else {
             throw new Error("Tesseract library not loaded");
        }
    } catch (e) {
        console.error("Failed to init OCR worker:", e);
        ocrStatusEl.textContent = "OCR เริ่มต้นล้มเหลว";
        ocrWorker = null;
        alert(`การเริ่มต้น OCR ล้มเหลว:\n${e.message}\n\nตรวจสอบ console (F12) สำหรับรายละเอียดเพิ่มเติม`);
    } finally {
        ocrLangSelect.disabled = false;
    }
}

ocrLangSelect.addEventListener('change', updateOCRWorker);

// Image Upload
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            boxes = [];
            activeBoxId = null;
            draw();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Canvas Events
canvas.addEventListener('mousedown', (e) => {
    if (!img.src) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Check if clicked existing box
    const clickedBox = boxes.slice().reverse().find(b => 
        x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h
    );

    if (clickedBox) {
        selectBox(clickedBox.id);
        isDrawing = false;
        
        // Start dragging
        isDraggingBox = true;
        dragOffsetX = x - clickedBox.x;
        dragOffsetY = y - clickedBox.y;
    } else {
        // Start new selection
        activeBoxId = null;
        selectionPanel.style.display = 'none';
        isDrawing = true;
        isDraggingBox = false;
        startX = x;
        startY = y;
        currentSelection = { x, y, w: 0, h: 0 };
    }
    draw();
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 1. Handle Box Dragging
    if (isDraggingBox && activeBoxId) {
        const box = boxes.find(b => b.id === activeBoxId);
        if (box) {
            box.x = x - dragOffsetX;
            box.y = y - dragOffsetY;
            draw();
            // Optional: Update selection info if needed (but usually we only edit text/style there)
        }
        return;
    }

    // 2. Cursor Feedback
    const hoveredBox = boxes.slice().reverse().find(b => 
        x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h
    );
    canvas.style.cursor = hoveredBox ? 'move' : (isDrawing ? 'crosshair' : 'default');

    // 3. Handle New Box Drawing
    if (!isDrawing) return;
    
    currentSelection.w = x - startX;
    currentSelection.h = y - startY;
    draw();
});

canvas.addEventListener('mouseup', async (e) => {
    if (isDraggingBox) {
        isDraggingBox = false;
        return;
    }

    if (!isDrawing) return;
    isDrawing = false;

    // Normalize negative width/height
    if (currentSelection.w < 0) {
        currentSelection.x += currentSelection.w;
        currentSelection.w = Math.abs(currentSelection.w);
    }
    if (currentSelection.h < 0) {
        currentSelection.y += currentSelection.h;
        currentSelection.h = Math.abs(currentSelection.h);
    }

    // Ignore tiny boxes
    if (currentSelection.w < 10 || currentSelection.h < 10) {
        currentSelection = null;
        draw();
        return;
    }

    // Create new box
    const newBox = {
        id: Date.now(),
        x: currentSelection.x,
        y: currentSelection.y,
        w: currentSelection.w,
        h: currentSelection.h,
        original: '',
        translated: '',
        style: { ...currentStyle },
        patch: true
    };
    
    boxes.push(newBox);
    currentSelection = null;
    selectBox(newBox.id);
    
    // Trigger OCR
    await performOCR(newBox);
});

// Drawing Logic
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. Draw Image
    if (img.src) {
        ctx.drawImage(img, 0, 0);
    }

    // 2. Draw Boxes (Patch & Text)
    boxes.forEach(box => {
        ctx.save();
        
        // Center of box for rotation
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;

        // Apply Patch (Inpainting - Simple Fill)
        if (box.patch && box.translated) {
            // Sample background color (simple approach: top-left pixel of box)
            // Ideally we'd calculate average, but this is "Simple Patch"
            // For now, let's just use white or a clear fill logic
            // To make it better, let's grab the pixel data
            const p = ctx.getImageData(box.x, box.y, 1, 1).data;
            // Or just default to white if we can't guess well
            ctx.fillStyle = `rgb(${p[0]}, ${p[1]}, ${p[2]})`; 
            // Actually, we should probably just use white for manga usually
            ctx.fillStyle = "#ffffff";
            
            // Draw patch
            // Note: Patch shouldn't rotate if we want to cover the original rect perfectly,
            // but if text rotates, maybe patch should too? 
            // Usually we patch the original axis-aligned rect to hide original text.
            ctx.fillRect(box.x, box.y, box.w, box.h);
        }

        // Draw Text
        if (box.translated) {
            ctx.translate(cx, cy);
            ctx.rotate(box.style.rotation * Math.PI / 180);
            
            // Build Font String
            let fontStr = '';
            if (box.style.italic) fontStr += 'italic ';
            if (box.style.bold) fontStr += 'bold ';
            fontStr += `${box.style.fontSize}px ${box.style.fontFamily}, sans-serif`;
            
            ctx.font = fontStr;
            ctx.textBaseline = 'middle';
            
            // Alignment Logic
            // Canvas textAlign: start (left), center, end (right)
            // But we are drawing line by line relative to center (cx, cy)
            // So we need to offset x based on alignment relative to box width
            
            let alignOffset = 0;
            if (box.style.align === 'left') {
                ctx.textAlign = 'left';
                alignOffset = -box.w / 2;
            } else if (box.style.align === 'right') {
                ctx.textAlign = 'right';
                alignOffset = box.w / 2;
            } else {
                ctx.textAlign = 'center';
                alignOffset = 0;
            }

            // Word wrapping (with newline support)
            const paragraphs = box.translated.split('\n');
            let lines = [];
            // Rough estimate of max width - padding or scaling allowance
            // We use box.w as the wrapping limit. 
            
            paragraphs.forEach(paragraph => {
                const words = paragraph.split(' ');
                let line = '';
                
                for(let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = ctx.measureText(testLine);
                    const testWidth = metrics.width;
                    
                    // If line is too long and not the first word of the line
                    if (testWidth > box.w && line !== '') {
                        lines.push(line);
                        line = words[n] + ' ';
                    } else {
                        line = testLine;
                    }
                }
                lines.push(line);
            });

            // Draw lines
            const lineHeight = box.style.fontSize * 1.2;
            const totalHeight = lines.length * lineHeight;
            let startYText = -((totalHeight / 2) - (lineHeight / 2));

            lines.forEach((l, i) => {
                const ly = startYText + (i * lineHeight);
                
                // Stroke
                if (box.style.strokeWidth > 0) {
                    ctx.strokeStyle = box.style.strokeColor;
                    ctx.lineWidth = box.style.strokeWidth;
                    ctx.strokeText(l, alignOffset, ly);
                }
                
                // Fill
                ctx.fillStyle = box.style.color;
                ctx.fillText(l, alignOffset, ly);
            });

            ctx.restore();
        }
    });

    // 3. Draw Selection Overlay (Active Box)
    if (activeBoxId) {
        const box = boxes.find(b => b.id === activeBoxId);
        if (box) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(box.x, box.y, box.w, box.h);
        }
    }

    // 4. Draw Current Dragging Selection
    if (isDrawing && currentSelection) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(currentSelection.x, currentSelection.y, currentSelection.w, currentSelection.h);
        ctx.setLineDash([]);
    }
}

// Logic - Box Management
const boldBtn = document.getElementById('boldBtn');
const italicBtn = document.getElementById('italicBtn');
const alignLeftBtn = document.getElementById('alignLeftBtn');
const alignCenterBtn = document.getElementById('alignCenterBtn');
const alignRightBtn = document.getElementById('alignRightBtn');

// ...

function selectBox(id) {
    activeBoxId = id;
    const box = boxes.find(b => b.id === id);
    if (!box) return;

    selectionPanel.style.display = 'block';
    
    // Populate UI
    originalTextEl.value = box.original || '';
    translatedTextEl.value = box.translated || '';
    
    // Styles
    fontFamilyInput.value = box.style.fontFamily || 'Arial';
    fontSizeInput.value = box.style.fontSize;
    colorInput.value = box.style.color;
    strokeInput.value = box.style.strokeWidth;
    strokeColorInput.value = box.style.strokeColor;
    rotationInput.value = box.style.rotation;
    rotationVal.textContent = box.style.rotation;
    patchInput.checked = box.patch;

    // Sync global style to match selected box
    currentStyle = { ...box.style };

    // Format Buttons
    updateFormatButtons(box.style);

    draw();
}

function updateFormatButtons(style) {
    boldBtn.classList.toggle('active', style.bold);
    italicBtn.classList.toggle('active', style.italic);
    
    alignLeftBtn.classList.remove('active');
    alignCenterBtn.classList.remove('active');
    alignRightBtn.classList.remove('active');
    
    if (style.align === 'left') alignLeftBtn.classList.add('active');
    else if (style.align === 'right') alignRightBtn.classList.add('active');
    else alignCenterBtn.classList.add('active');
}

function updateActiveBox() {
    // Update global style from inputs (so next box inherits this)
    currentStyle.fontFamily = fontFamilyInput.value;
    currentStyle.fontSize = parseInt(fontSizeInput.value) || 20;
    currentStyle.color = colorInput.value;
    currentStyle.strokeWidth = parseInt(strokeInput.value) || 0;
    currentStyle.strokeColor = strokeColorInput.value;
    currentStyle.rotation = parseInt(rotationInput.value) || 0;

    if (!activeBoxId) return;
    const box = boxes.find(b => b.id === activeBoxId);
    if (!box) return;

    box.original = originalTextEl.value;
    box.translated = translatedTextEl.value;
    box.style.fontFamily = currentStyle.fontFamily;
    box.style.fontSize = currentStyle.fontSize;
    box.style.color = currentStyle.color;
    box.style.strokeWidth = currentStyle.strokeWidth;
    box.style.strokeColor = currentStyle.strokeColor;
    box.style.rotation = currentStyle.rotation;
    box.patch = patchInput.checked;
    
    // Note: bold/italic/align are updated by their own listeners directly
    
    draw();
}

// Format Listeners
boldBtn.addEventListener('click', () => {
    currentStyle.bold = !currentStyle.bold;
    if (activeBoxId) {
        const box = boxes.find(b => b.id === activeBoxId);
        box.style.bold = currentStyle.bold;
        updateFormatButtons(box.style);
        draw();
    } else {
        updateFormatButtons(currentStyle);
    }
});

italicBtn.addEventListener('click', () => {
    currentStyle.italic = !currentStyle.italic;
    if (activeBoxId) {
        const box = boxes.find(b => b.id === activeBoxId);
        box.style.italic = currentStyle.italic;
        updateFormatButtons(box.style);
        draw();
    } else {
        updateFormatButtons(currentStyle);
    }
});

alignLeftBtn.addEventListener('click', () => setAlign('left'));
alignCenterBtn.addEventListener('click', () => setAlign('center'));
alignRightBtn.addEventListener('click', () => setAlign('right'));

function setAlign(align) {
    currentStyle.align = align;
    if (activeBoxId) {
        const box = boxes.find(b => b.id === activeBoxId);
        box.style.align = align;
        updateFormatButtons(box.style);
        draw();
    } else {
        updateFormatButtons(currentStyle);
    }
}

autoTranslateToggle.addEventListener('change', () => {
    localStorage.setItem('manga_auto_translate', autoTranslateToggle.checked);
});

// Event Listeners for Controls
[fontSizeInput, fontFamilyInput, colorInput, strokeInput, strokeColorInput, patchInput].forEach(el => {
    el.addEventListener('input', updateActiveBox);
});
rotationInput.addEventListener('input', (e) => {
    rotationVal.textContent = e.target.value;
    updateActiveBox();
});
originalTextEl.addEventListener('input', updateActiveBox);
translatedTextEl.addEventListener('input', updateActiveBox);
document.getElementById('applyTextBtn').addEventListener('click', draw); // Just re-draw

document.getElementById('deleteBoxBtn').addEventListener('click', () => {
    if (activeBoxId) {
        boxes = boxes.filter(b => b.id !== activeBoxId);
        activeBoxId = null;
        selectionPanel.style.display = 'none';
        draw();
    }
});

document.getElementById('clearCanvasBtn').addEventListener('click', () => {
    boxes = [];
    activeBoxId = null;
    selectionPanel.style.display = 'none';
    draw();
});

// Update Models when Provider changes
providerSelect.addEventListener('change', () => {
    updateModelList();
    // Auto-save provider selection? Maybe wait for explicit save
    // Also check if key is valid for this provider?
    checkApiStatus();
});

document.getElementById('pasteApiBtn').addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            apiKeyInput.value = text;
            checkApiStatus();
        } else {
            alert('คลิปบอร์ดว่างเปล่า!');
        }
    } catch (err) {
        console.error('Failed to read clipboard:', err);
        // Fallback for some environments where navigator.clipboard might fail or need permission
        // Attempt to focus and execCommand (deprecated but works in some older contexts)
        apiKeyInput.focus();
        const result = document.execCommand('paste');
        if (!result) {
             alert('ไม่สามารถเข้าถึงคลิปบอร์ดได้อัตโนมัติ กรุณากด Ctrl+V ในช่อง');
        } else {
            checkApiStatus();
        }
    }
});

saveApiBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    const provider = providerSelect.value;
    
    if (key) {
        localStorage.setItem('manga_api_key', key);
        localStorage.setItem('manga_provider', provider);
        updateApiStatus(true, 'บันทึกแล้ว');
        alert('บันทึกคีย์ API และผู้ให้บริการแล้ว!');
    } else {
        localStorage.removeItem('manga_api_key');
        updateApiStatus(false, 'ลบแล้ว');
        alert('ลบคีย์ API จากที่จัดเก็บแล้ว');
    }
});

function updateApiStatus(isSaved, text) {
    if (isSaved) {
        apiKeyStatusEl.textContent = `(${text})`;
        apiKeyStatusEl.style.color = '#28a745'; // Green
    } else {
        apiKeyStatusEl.textContent = `(${text})`;
        apiKeyStatusEl.style.color = '#dc3545'; // Red
    }
}

function checkApiStatus() {
    const key = apiKeyInput.value.trim();
    if (!key) {
        updateApiStatus(false, 'ว่าง');
        return;
    }
    
    const savedKey = localStorage.getItem('manga_api_key');
    if (key === savedKey) {
        updateApiStatus(true, 'บันทึกแล้ว');
    } else {
        updateApiStatus(false, 'ยังไม่ได้บันทึก');
    }
}

apiKeyInput.addEventListener('input', checkApiStatus);

async function updateModelList() {
    const providerKey = providerSelect.value;
    const provider = API_PROVIDERS[providerKey];
    
    // Update Placeholder
    apiKeyInput.placeholder = provider.placeholder;
    
    // Clear and Show Loading
    modelSelect.innerHTML = '<option>กำลังโหลด...</option>';
    modelSelect.disabled = true;

    // Fetch OpenRouter Models dynamically if empty
    if (providerKey === 'openrouter' && provider.models.length === 0) {
        try {
            const res = await fetch('https://openrouter.ai/api/v1/models');
            if (res.ok) {
                const data = await res.json();
                // Filter for free models (id ends with :free)
                const freeModels = data.data
                    .filter(m => m.id.endsWith(':free'))
                    .sort((a, b) => a.name.localeCompare(b.name));
                
                provider.models = freeModels.map(m => ({
                    id: m.id,
                    name: m.name
                }));
            } else {
                throw new Error(`OpenRouter API Error: ${res.status}`);
            }
        } catch (e) {
            console.error("Failed to fetch OpenRouter models, using fallback.", e);
            // Fallback models if fetch fails
            provider.models = [
                { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash Exp (Free)" },
                { id: "google/gemini-2.0-pro-exp-02-05:free", name: "Gemini 2.0 Pro Exp (Free)" },
                { id: "meta-llama/llama-3.2-3b-instruct:free", name: "Llama 3.2 3B (Free)" }
            ];
        }
    }

    // Update Models UI
    modelSelect.innerHTML = '';
    modelSelect.disabled = false;
    
    if (provider.models.length === 0) {
        const option = document.createElement('option');
        option.textContent = "ไม่พบโมเดล";
        modelSelect.appendChild(option);
    } else {
        provider.models.forEach(m => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.name;
            modelSelect.appendChild(option);
        });
    }
}

document.getElementById('downloadBtn').addEventListener('click', () => {
    // Deselect active box to hide the green selection border before saving
    const prevActiveId = activeBoxId;
    activeBoxId = null;
    draw();
    
    const link = document.createElement('a');
    link.download = 'manga-translated.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    // Restore selection
    activeBoxId = prevActiveId;
    draw();
});

// OCR Function
async function performOCR(box) {
    ocrStatusEl.textContent = "กำลังสแกน...";
    
    // 1. Crop image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = box.w;
    tempCanvas.height = box.h;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    const dataUrl = tempCanvas.toDataURL('image/png');

    // 2. Tesseract
    try {
        if (!ocrWorker) {
             if (typeof Tesseract === 'undefined') {
                throw new Error("Tesseract.js is not loaded.");
             }
             // Try to re-init if null
             await updateOCRWorker();
        }

        if (!ocrWorker) {
            throw new Error("OCR Worker failed to initialize. Please refresh or check console.");
        }

        const ret = await ocrWorker.recognize(dataUrl);
        const text = ret.data.text;
        // Don't terminate worker, keep it for next time

        box.original = text.trim();
        if (activeBoxId === box.id) {
            originalTextEl.value = box.original;
        }
        
        if (box.original) {
             if (autoTranslateToggle.checked) {
                 ocrStatusEl.textContent = "OCR เสร็จสิ้น กำลังแปลภาษา...";
                 await translateText(box);
             } else {
                 ocrStatusEl.textContent = "OCR เสร็จสิ้น รอการแปลภาษาด้วยตนเอง";
             }
        } else {
             ocrStatusEl.textContent = "OCR เสร็จสิ้น: ไม่พบข้อความ";
             console.warn("OCR found no text in selection.");
        }

    } catch (err) {
        console.error("OCR Error:", err);
        ocrStatusEl.textContent = "OCR ล้มเหลว: " + err.message;
    }
}

// Translation Function
async function translateText(box) {
    // Remove newlines to make it a single long sentence
    const text = box.original ? box.original.replace(/[\r\n]+/g, ' ') : "";
    if (!text) return;
    
    let apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert("กรุณาป้อนคีย์ API เพื่อแปลภาษา");
        return;
    }

    const providerKey = providerSelect.value;
    const provider = API_PROVIDERS[providerKey];
    
    // Validation for OpenRouter Key
    if (providerKey === 'openrouter' && !apiKey.startsWith('sk-or-')) {
        console.warn("Key does not start with 'sk-or-'.");
    }

    console.log(`Using Provider: ${provider.name}, Key: ${apiKey.substring(0, 5)}...`);

    ocrStatusEl.textContent = "กำลังแปลภาษา...";

    const model = modelSelect.value;
    
    let sourceLangName = "ภาษาญี่ปุ่น";
    switch(currentOcrLang) {
        case 'eng': sourceLangName = "ภาษาอังกฤษ"; break;
        case 'chi_sim': sourceLangName = "ภาษาจีน (ตัวย่อ)"; break;
        case 'chi_tra': sourceLangName = "ภาษาจีน (ตัวเต็ม)"; break;
        case 'kor': sourceLangName = "ภาษาเกาหลี"; break;
    }

    const sysPrompt = `คุณคือผู้เชี่ยวชาญด้านการแปลมังงะ ให้แปลข้อความจาก${sourceLangName}เป็นไทย โดยรักษาบริบทและน้ำเสียงของตัวละครไว้ สั้น กระชับ เข้าใจง่าย`;

    try {
        let url = provider.url;
        let options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        };

        // Prepare Request based on Provider Format
        if (provider.format === 'openai') {
            options.headers["Authorization"] = `Bearer ${apiKey}`;
            if (providerKey === 'openrouter') {
                // Handle file:// origin
                const siteUrl = (window.location.origin !== 'null' && window.location.origin) ? window.location.origin : "https://manga-tool.local";
                options.headers["HTTP-Referer"] = siteUrl;
                options.headers["X-Title"] = "Manga Translation Tool";
            }
            
            // Special handling for Gemma models on OpenRouter (Google AI Studio)
            // They often reject "system" role with "Developer instruction is not enabled"
            let messages = [];
            if (model.includes('gemma')) {
                messages = [
                    { "role": "user", "content": sysPrompt + "\n\n" + text }
                ];
            } else {
                messages = [
                    { "role": "system", "content": sysPrompt },
                    { "role": "user", "content": text }
                ];
            }

            options.body = JSON.stringify({
                "model": model,
                "messages": messages
            });

        } else if (provider.format === 'google') {
            // Google Gemini Direct API
            // URL format: .../models/[MODEL]:generateContent?key=[KEY]
            url = `${provider.url}${model}:generateContent?key=${apiKey}`;
            
            // Gemini doesn't support system prompt in v1beta same way as OpenAI, 
            // but we can put it in contents or systemInstruction (if model supports it).
            // For safety and compatibility, we'll prepend it to user message or use systemInstruction.
            // Gemini 1.5 supports systemInstruction.
            
            const payload = {
                "contents": [{
                    "parts": [{ "text": text }]
                }],
                "systemInstruction": {
                    "parts": [{ "text": sysPrompt }]
                }
            };
            
            options.body = JSON.stringify(payload);
        }

        const response = await fetch(url, options);
        const rawText = await response.text();
        let data;

        try {
            data = JSON.parse(rawText);
        } catch (e) {
            // If response is not JSON, it might be an HTML error page or raw text
            if (!response.ok) {
                throw new Error(`API Error ${response.status}: ${rawText.substring(0, 200)}`);
            }
            throw new Error(`Invalid JSON Response: ${rawText.substring(0, 200)}`);
        }

        if (!response.ok) {
            const errMsg = data.error ? (data.error.message || JSON.stringify(data.error)) : rawText;
            throw new Error(`API Error ${response.status}: ${errMsg}`);
        }
        
        if (data.error) {
            throw new Error(`API Error: ${data.error.message || JSON.stringify(data.error)}`);
        }

        let translated = "";

        // Parse Response based on Provider Format
        if (provider.format === 'openai') {
            if (data.choices && data.choices[0]) {
                translated = data.choices[0].message.content;
            } else {
                console.error("Unexpected API Response:", data);
                throw new Error("No choices in response");
            }
        } else if (provider.format === 'google') {
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                translated = data.candidates[0].content.parts[0].text;
            } else {
                console.error("Unexpected Gemini Response:", data);
                throw new Error("No candidates in response");
            }
        }

        box.translated = translated.trim();
        if (activeBoxId === box.id) {
            translatedTextEl.value = box.translated;
        }
        updateActiveBox(); // Render it immediately
        ocrStatusEl.textContent = "แปลภาษาเสร็จสิ้น";

    } catch (err) {
        console.error("Translation Error Details:", err);
        let msg = "แปลภาษาล้มเหลว";
        
        if (err.message.includes('404')) msg = "ไม่พบโมเดล (404)";
        else if (err.message.includes('400')) msg = "คำขอไม่ถูกต้อง (400)";
        else if (err.message.includes('401')) msg = "ไม่ได้รับอนุญาต (401) ตรวจสอบคีย์";
        else if (err.message.includes('429')) msg = "เกินโควต้า (429)";
        else if (err.message.includes('Failed to fetch')) msg = "ข้อผิดพลาดการเชื่อมต่อ (CORS/Network)";
        
        ocrStatusEl.textContent = msg;
        
        // Detailed Alert
        let alertMsg = `การเชื่อมต่อ API ล้มเหลว!\n\nข้อผิดพลาด: ${err.message}\n\nการแก้ไขปัญหา:`;
        if (err.message.includes('429')) {
            if (err.message.includes('google')) {
                alertMsg += `\n- Google Gemini Quota Exceeded for this model.\n- แนะนำ: ลองเปลี่ยนเป็น "Gemini 1.5 Flash" (มีโควต้าฟรีเยอะกว่า)\n- หรือสร้าง API Key ใหม่`;
            } else {
                alertMsg += `\n- API Key ของคุณเครดิตหมดหรือเกินโควต้ารายวัน\n- ลองเปลี่ยน Provider เป็น "Google Gemini" (มี Free Tier เยอะ)`;
            }
        } else {
            alertMsg += `\n1. ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต\n2. ตรวจสอบว่า API Key ถูกต้อง\n3. ตรวจสอบสถานะของโมเดล`;
        }
        
        alert(alertMsg);
    }
}

document.getElementById('translateBtn').addEventListener('click', () => {
    if (activeBoxId) {
        const box = boxes.find(b => b.id === activeBoxId);
        translateText(box);
    }
});

// Free Translation Logic
freeTranslateBtn.addEventListener('click', async () => {
    // Determine text source
    let text = "";
    if (activeBoxId) {
        const box = boxes.find(b => b.id === activeBoxId);
        text = box ? box.original : "";
    } else {
        text = originalTextEl.value.trim();
    }

    // Remove newlines to make it a single long sentence
    if (text) {
        text = text.replace(/[\r\n]+/g, ' ');
    }

    if (!text) {
        alert("ไม่มีข้อความต้นฉบับ (No original text)");
        return;
    }

    const service = freeServiceSelect.value;
    ocrStatusEl.textContent = `กำลังแปลด้วย ${service}...`;
    
    try {
        let translated = "";
        
        // Map OCR lang to API lang codes
        let sourceLang = 'auto';
        if (currentOcrLang === 'jpn') sourceLang = 'ja';
        else if (currentOcrLang === 'eng') sourceLang = 'en';
        else if (currentOcrLang === 'chi_sim') sourceLang = 'zh-CN';
        else if (currentOcrLang === 'chi_tra') sourceLang = 'zh-TW';
        else if (currentOcrLang === 'kor') sourceLang = 'ko';

        if (service === 'google_gtx') {
            // Unofficial Google Translate API (GTX)
            // Note: This often works but can be blocked by CORS or rate limits
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=th&dt=t&q=${encodeURIComponent(text)}`;
            
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            const data = await res.json();
            // data[0] contains array of segments: [[trans, orig, ...], [trans, orig, ...]]
            if (data && data[0]) {
                translated = data[0].map(seg => seg[0]).join('');
            }

        } else if (service === 'mymemory') {
            // MyMemory API
            // Requires valid language pair (no 'auto' usually, but 'aut' might work)
            if (sourceLang === 'auto') sourceLang = 'aut'; // MyMemory uses 'aut' for auto-detect
            
            // Note: MyMemory has a daily limit for free requests and max 500 chars per request usually
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|th`;
            
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.responseStatus === 200) {
                translated = data.responseData.translatedText;
            } else {
                throw new Error(data.responseDetails || `MyMemory Error: ${data.responseStatus}`);
            }
        } else if (service === 'simplytranslate') {
            // SimplyTranslate API
            // Uses simplytranslate.org by default. Note: Public instances may have rate limits or CORS issues.
            // Endpoint: https://simplytranslate.org/api/translate/?engine=google&from=...&to=...&text=...
            
            // Map 'auto' to 'auto' for SimplyTranslate (it usually supports it)
            if (sourceLang === 'auto') sourceLang = 'auto';

            const url = `https://simplytranslate.org/api/translate/?engine=google&from=${sourceLang}&to=th&text=${encodeURIComponent(text)}`;
            
            const res = await fetch(url);
            if (!res.ok) throw new Error(`SimplyTranslate HTTP ${res.status}`);
            
            const data = await res.json();
            // Response format usually: {"translated_text": "..."} or {"translated-text": "..."}
            translated = data.translated_text || data['translated-text'];
            
            if (!translated) {
                 throw new Error("SimplyTranslate ไม่คืนค่าข้อความ (Instance อาจจะโหลดหนัก)");
            }
        }

        if (translated) {
            // Success
            if (activeBoxId) {
                const box = boxes.find(b => b.id === activeBoxId);
                if (box) {
                    box.translated = translated;
                    translatedTextEl.value = translated;
                    updateActiveBox();
                }
            } else {
                 translatedTextEl.value = translated;
            }
            ocrStatusEl.textContent = "แปลฟรีเสร็จสิ้น";
        } else {
            throw new Error("ไม่ได้รับคำแปลกลับมา");
        }

    } catch (e) {
        console.error("Free Translation Error:", e);
        ocrStatusEl.textContent = "แปลภาษาล้มเหลว";
        
        // Fallback suggestion
        let confirmOpen = confirm(`แปลภาษาล้มเหลว: ${e.message}\n\nWeb browsers อาจบล็อกการร้องขอบางอย่าง\n\nต้องการเปิด Google Translate ในแท็บใหม่หรือไม่?`);
        if (confirmOpen) {
            const googleUrl = `https://translate.google.com/?sl=auto&tl=th&text=${encodeURIComponent(text)}&op=translate`;
            window.open(googleUrl, '_blank');
        }
    }
});

// Start
init();
