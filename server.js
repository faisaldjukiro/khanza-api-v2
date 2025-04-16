const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const app = express();
const md5 = require('md5'); 
const db = require('./config/db');
const apiRoutes = require('./routes/api');

dotenv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// route login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = md5(password);

  const sql = 'SELECT * FROM user_isal WHERE kd_peg = ? AND password = ? LIMIT 1';
  db.query(sql, [username, hashedPassword], (err, results) => {
    if (err) return res.status(500).json({ message: 'Terjadi kesalahan', error: err });

    if (results.length > 0) {
      const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });
      return res.json({ token });
    } else {
      return res.status(401).json({ message: 'Username atau password salah' });
    }
  });
});


app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
