const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8888;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});
app.use(express.static(path.join(__dirname, 'web')));

// 讀取 CSV 門檻價格邏輯
app.get('/prices', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'prices.csv');
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    const formattedData = rawData.slice(1)
      .filter(row => row[0]) 
      .map(row => ({
        name: row[0].toString().trim(),
        basePrice: parseFloat(row[2]) || 0,
        limit1: parseFloat(row[3]) || 0,
        special1: parseFloat(row[4]) || 0,
        limit2: parseFloat(row[5]) || 0,
        special2: parseFloat(row[6]) || 0
      }));
    res.json(formattedData);
  } catch (e) {
    res.status(500).json([]);
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const phone = req.body.phone || 'unknown';
    const date = new Date().toISOString().slice(0, 10);
    const dir = path.join(__dirname, 'uploads', `${date}_${phone}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});
const upload = multer({ storage });

app.post('/upload', upload.array('photos'), (req, res) => {
  const { phone, size, total, count } = req.body;
  const date = new Date().toISOString().slice(0, 10);
  const orderPath = path.join(__dirname, 'uploads', `${date}_${phone}`, '訂單明細.txt');
  
  const content = `--- 明影訂單 ---\n時間: ${new Date().toLocaleString()}\n電話: ${phone}\n規格: ${size}\n總張數: ${count} 張\n總金額: ${total} 元 (含四捨五入)\n--------------`;
  
  fs.writeFileSync(orderPath, content);
  console.log(`✅ 訂單已儲存: ${phone}`);
  res.send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 系統運行中！Port: ${PORT}`);
});