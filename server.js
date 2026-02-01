const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// --- 設定區：請填入你的 16 位密碼 ---
const MY_GMAIL = 'kdikdi77@gmail.com'; 
const MY_APP_PASSWORD = 'svmq lkzk qrtu oqvg'; // 👈 記得把這行換成你剛申請的密碼
// ------------------------------

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 確保 uploads 資料夾存在
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer 設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// 1. 讓網頁讀取價格表
app.get('/prices', (req, res) => {
  const pricePath = path.join(__dirname, 'prices.json');
  if (fs.existsSync(pricePath)) {
    res.sendFile(pricePath);
  } else {
    res.json([{ "name": "4x6", "basePrice": 6, "limit1": 0, "special1": 6, "limit2": 0, "special2": 6 }]);
  }
});

// 2. 接收訂單並寄送 Email
app.post('/upload', upload.array('photos'), async (req, res) => {
  try {
    const { phone, size, total, count } = req.body;
    const files = req.files;

    console.log(`收到訂單：${phone}, 共 ${count} 張`);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: MY_GMAIL,
        pass: MY_APP_PASSWORD
      }
    });

    const mailOptions = {
      from: `"明影線上沖印" <${MY_GMAIL}>`,
      to: MY_GMAIL, 
      subject: `📸 新訂單通知 - 電話：${phone}`,
      text: `--- 明影訂單明細 ---\n客戶電話: ${phone}\n選擇規格: ${size}\n總張數: ${count} 張\n總金額: ${total} 元\n------------------\n照片已夾帶在附件中。`,
      attachments: files.map(file => ({
        filename: file.originalname,
        path: file.path
      }))
    };

    await transporter.sendMail(mailOptions);

    // 寄完信後清理伺服器暫存檔
    files.forEach(file => {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    });

    res.status(200).send('OK');
  } catch (error) {
    console.error('處理訂單失敗:', error);
    res.status(500).send('Server Error');
  }
});

app.listen(port, () => {
  console.log(`伺服器運行中：http://localhost:${port}`);
});

