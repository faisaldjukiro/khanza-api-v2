const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const app = express();
const md5 = require('md5'); 
const db = require('./config/db');
const apiRoutes = require('./routes/api');
const apiJasa = require('./routes/api-jasa');


dotenv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = md5(password);

  const sql = 'SELECT u.kd_peg,u.password,p.nama FROM user_isal u INNER JOIN pegawai p  ON u.kd_peg = p.nik WHERE kd_peg = ? AND password = ? LIMIT 1';
  db.query(sql, [username, hashedPassword], (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan pada server',
        error: err.message
      });
    }

    if (results.length > 0) {
      const user = results[0];
      const token = jwt.sign({ username: user.kd_peg }, process.env.JWT_SECRET, { expiresIn: '1h' });

      return res.status(200).json({
        success: true,
        message: 'Login berhasil',
        token,
        data: {
          user: {
            username: user.kd_peg,
            nama: user.nama
            
          }
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah'
      });
    }
  });
});


app.use('/api', apiRoutes);
app.use('/api-jasa', apiJasa);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
