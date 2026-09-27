const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'db.json');

app.use(express.json());
app.use(express.static(__dirname));

// ฟังก์ชันอ่านข้อมูลแบบ Safe Read
function readBookings() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading db.json:', error.message);
    return [];
  }
}

// หน้าแรกสำหรับทดสอบว่า API รันติดไหม
app.get('/', (req, res) => {
  res.send('API Running Successfully!');
});

// ดึงข้อมูลทั้งหมด
app.get('/api/bookings', (req, res) => {
  const data = readBookings();
  res.json(data);
});

// รัน listen เฉพาะตอนเปิดทดสอบในเครื่อง local เท่านั้น
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

// ต้องส่งออก app เป็นโมดูลสำหรับ Vercel Serverless
module.exports = app;
