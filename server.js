const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// --- 設定區：請修改以下資訊 ---
const MY_GMAIL = '7658856@gmail.com'; // 你的 Gmail
const MY_APP_PASSWORD = 'xxxx xxxx xxxx xxxx'; // 你申請到的 16 位應用程式密碼
// --------------------------

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 確保 uploads 資料夾存在
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer 設定：存放在伺服器的臨時位置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// 1. 讓網頁讀取價格表 (讀取同資料夾下的 prices.json)
app.get('/prices', (req, res) => {
  const pricePath = path.join(__dirname, 'prices.json');
  if (fs.existsSync(pricePath)) {
    res.sendFile(pricePath);
  } else {
    // 如果檔案不存在，回傳預設值以免網頁當掉
    res.json([{ "name": "4x6", "basePrice": 6, "limit1": 0, "special1": 6, "limit2": 0, "special2": 6 }]);
  }
});

// 2. 接收訂單並寄送 Email
app.post('/upload', upload.array('photos'), async (req, res) => {
  try {
    const { phone, size, total, count } = req.body;
    const files = req.files;

    console.log(`收到訂單：${phone}, 共 ${count} 張`);

    // 設定寄信程式
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: MY_GMAIL,
        pass: MY_APP_PASSWORD
      }
    });

    // 設定信件內容
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

    // 執行寄信
    await transporter.sendMail(mailOptions);

    // 寄完信後，刪除伺服器上的臨時照片以節省空間
    files.forEach(file => fs.unlinkSync(file.path));

    res.status(200).send('Order processed and email sent.');
  } catch (error) {
    console.error('處理訂單失敗:', error);
    res.status(500).send('Server Error');
  }
});

app.listen(port, () => {
  console.log(`伺服器運行中：http://localhost:${port}`);
});
