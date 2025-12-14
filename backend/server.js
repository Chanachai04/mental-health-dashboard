const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// สร้าง connection pool แทน single connection
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// ทดสอบการเชื่อมต่อ
db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("Connected to MySQL database");
  connection.release();
});

// API endpoint สำหรับดึงข้อมูลโพสต์
app.get("/api/posts", (req, res) => {
  const { startDate, endDate, platform, searchTerm } = req.query;

  let query = "SELECT id, username, caption, platform, baseurl, created_at as createAt FROM mental_health WHERE 1=1";
  const params = [];

  if (startDate) {
    query += " AND created_at >= ?";
    params.push(startDate);
  }

  if (endDate) {
    query += " AND created_at <= ?";
    params.push(endDate);
  }

  if (platform && platform !== "ทั้งหมด") {
    query += " AND platform = ?";
    params.push(platform);
  }

  if (searchTerm) {
    query += " AND caption LIKE ?";
    params.push(`%${searchTerm}%`);
  }

  query += " ORDER BY created_at DESC";

  db.query(query, params, (err, results) => {
    if (err) {
      console.error("Error fetching posts:", err);
      
      // ถ้าเป็น connection error ให้ลอง reconnect
      if (err.fatal) {
        console.log("Fatal error detected, connection pool will handle reconnection");
      }
      
      return res.status(500).json({ 
        error: "Failed to fetch posts", 
        details: err.message 
      });
    }
    res.json(results);
  });
});


const PORT = process.env.PORT || 5151;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Network: http://${getLocalIP()}:${PORT}`);
});

// ฟังก์ชันหา IP Address
function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}
