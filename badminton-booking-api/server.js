const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'db.json');

app.use(express.json());
app.use(express.static(__dirname));

function readBookings() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('อ่าน db.json ไม่สำเร็จ:', error.message);
    return [];
  }
}

function writeBookings(bookings) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2), 'utf8');
}

function toMinutes(value) {

  const text = String(value);

  const colon = text.indexOf(':');

  const hour = Number(
    text.substring(0, colon)
  );

  const minute = Number(
    text.substring(colon + 1)
  );

  return hour * 60 + minute;
}


function overlaps(startA, endA, startB, endB) {
  return toMinutes(startA) < toMinutes(endB) &&
         toMinutes(endA) > toMinutes(startB);
}

function isValidTime(value) {
  return /^\d{2}:\d{2}$/.test(value) &&
         toMinutes(value) >= 0 &&
         toMinutes(value) <= 1439;
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
         !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}
// =====================================
// Bubble Sort
// เรียงวันที่และเวลา จากเก่า -> ใหม่
// ไม่ใช้ .sort()
// =====================================

function bubbleSortBookings(bookings) {

  for (let i = 0; i < bookings.length - 1; i++) {

    for (
      let j = 0;
      j < bookings.length - 1 - i;
      j++
    ) {

      const current =
        bookings[j].booking_date +
        ' ' +
        bookings[j].start_time;

      const next =
        bookings[j + 1].booking_date +
        ' ' +
        bookings[j + 1].start_time;


      if (current > next) {

        const temp = bookings[j];

        bookings[j] = bookings[j + 1];

        bookings[j + 1] = temp;
      }
    }
  }

  return bookings;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'success', message: 'API is running' });
});

app.get('/api/bookings', (req, res) => {

  const bookings = readBookings();

  bubbleSortBookings(bookings);

  res.json({
    status: 'success',
    data: bookings
  });

});

// Create booking
app.post('/api/bookings', (req, res) => {
  const {
    court_id,
    customer_name,
    phone,
    booking_date,
    start_time,
    end_time
  } = req.body || {};

  const courtId = Number(court_id);
  const name = String(customer_name || '').trim();
  const tel = String(phone || '').trim();

  if (!Number.isInteger(courtId) || courtId < 1 || courtId > 4) {
    return res.status(400).json({
      status: 'error',
      message: 'กรุณาเลือกคอร์ดให้ถูกต้อง'
    });
  }

  if (!name || !tel || !booking_date || !start_time || !end_time) {
    return res.status(400).json({
      status: 'error',
      message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
    });
  }

  if (!isValidDate(booking_date)) {
    return res.status(400).json({
      status: 'error',
      message: 'รูปแบบวันที่ไม่ถูกต้อง'
    });
  }

  if (!isValidTime(start_time) || !isValidTime(end_time) ||
      toMinutes(start_time) >= toMinutes(end_time)) {
    return res.status(400).json({
      status: 'error',
      message: 'ช่วงเวลาไม่ถูกต้อง'
    });
  }

  const bookings = readBookings();

 let conflict = null;

for (let i = 0; i < bookings.length; i++) {
  const item = bookings[i];

  if (
    Number(item.court_id) === courtId &&
    item.booking_date === booking_date &&
    overlaps(
      start_time,
      end_time,
      item.start_time,
      item.end_time
    )
  ) {
    conflict = item;
    break;
  }
}
// =====================================
// ตรวจสอบว่ามีการจองซ้ำหรือไม่
// =====================================

if (conflict !== null) {

  return res.status(409).json({

    status: 'error',

    message:
      `คอร์ด ${courtId} ถูกจองช่วง ` +
      `${conflict.start_time} - ` +
      `${conflict.end_time} แล้ว`

  });

}
  const booking = {
    id: Date.now(),
    court_id: courtId,
    customer_name: name,
    phone: tel,
    booking_date,
    start_time,
    end_time,
    created_at: new Date().toISOString()
  };

  bookings[bookings.length] = booking;
  writeBookings(bookings);

  return res.status(201).json({
    status: 'success',
    message: 'บันทึกการจองเรียบร้อยแล้ว',
    data: booking
  });
});



// Optional: delete a booking by ID
// =====================================
app.delete('/api/bookings', (req, res) => {
  writeBookings([]);

  return res.json({
    status: 'success',
    message: 'รีเซ็ตรายการจองทั้งหมดเรียบร้อยแล้ว'
  });
});

// DELETE: ลบรายการจอง
// =====================================

app.delete('/api/bookings/:id', (req, res) => {

  const id = Number(req.params.id);

  const bookings = readBookings();

  const next = [];

  let found = false;


  // ===================================
  // Linear Search
  // ค้นหา ID ที่ต้องการลบ
  // ===================================

  for (let i = 0; i < bookings.length; i++) {

    const item = bookings[i];


    if (Number(item.id) === id) {

      found = true;

    } else {

      next[next.length] = item;

    }
  }


  // ===================================
  // ถ้าไม่พบ ID
  // ===================================

  if (found === false) {

    return res.status(404).json({

      status: 'error',

      message: 'ไม่พบรายการจอง'

    });

  }


  // ===================================
  // บันทึก Array ใหม่
  // ===================================

  writeBookings(next);


  res.json({

    status: 'success',

    message: 'ลบรายการจองแล้ว'

  });

});
// =====================================
// เปิดหน้าเว็บ
// ====================================
const path = require('path');

// ให้ Express ให้บริการไฟล์ static (เช่น index.html)
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `Badminton Booking server running at http://localhost:${PORT}`
    );
  });
}

module.exports = app;
// เพิ่ม Route หน้าแรกเพื่อให้ทดสอบได้ว่า API ทำงานแล้ว
app.get('/', (req, res) => {
  res.send('API Running Successfully!');
});