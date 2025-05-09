const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); 
const verifyToken = require('../middleware/verifyToken');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../webapps/berkasrawat/pages/upload/'));
    // cb(null, path.join(__dirname, '../berkas'));

  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.post('/pasien', verifyToken, (req, res) => {
  const query = `
    SELECT 
      a.no_rawat, 
      b.no_rkm_medis AS nocm, 
      c.nm_pasien,
      TIMESTAMPDIFF(YEAR, c.tgl_lahir, CURDATE()) AS umur,
      CONCAT(e.kd_bangsal, ' - ', e.nm_bangsal) AS kamar,
      a.stts_pulang
    FROM kamar_inap a
    JOIN reg_periksa b ON a.no_rawat = b.no_rawat
    JOIN pasien c ON b.no_rkm_medis = c.no_rkm_medis
    JOIN kamar d ON a.kd_kamar = d.kd_kamar
    JOIN bangsal e ON d.kd_bangsal = e.kd_bangsal
    WHERE a.stts_pulang = '-' 
    ORDER BY a.tgl_masuk DESC
  `;
    // AND b.no_rkm_medis != 'XXXXXX'

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({
        status: 'error',
        message: 'Gagal mengambil data',
        error: err
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        status: 'not_found',
        message: 'Data pasien tidak ditemukan'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Data pasien berhasil diambil',
      data: results
    });
  });
});

router.post('/list-berkas', verifyToken, (req, res) => {
  const { no_rawat } = req.body;
  const url = 'http://114.30.92.12:8988/webapps/berkasrawat/';

  const query = `
    SELECT
      a.no_rawat,
      b.nama,
      CONCAT('${url}', a.lokasi_file) AS url
    FROM berkas_digital_perawatan a
    JOIN master_berkas_digital b ON a.kode = b.kode
    WHERE a.no_rawat = ?
  `;

  db.query(query, [no_rawat], (err, results) => {
    if (err) {
      return res.status(500).json({
        status: 'error',
        message: 'Gagal mengambil data',
        error: err
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        status: 'not_found',
        message: 'Data berkas tidak ditemukan'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Data berkas berhasil diambil',
      data: results
    });
  });
});

router.get('/validasitoken', verifyToken, (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Token masih valid',
    user: req.user
  });
});

router.post('/tambah-berkas', verifyToken, upload.single('file'), (req, res) => {
  const { no_rawat, kode } = req.body;

  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      message: 'File belum diupload'
    });
  }

  if (!no_rawat || !kode) {
    return res.status(400).json({
      status: 'error',
      message: 'no_rawat dan kode harus diisi'
    });
  }

  const lokasi_file = `pages/upload/${req.file.filename}`;

  const query = `
    INSERT INTO berkas_digital_perawatan (no_rawat, kode, lokasi_file)
    VALUES (?, ?, ?)
  `;

  db.query(query, [no_rawat, kode, lokasi_file], (err, result) => {
    if (err) {
      console.error('Insert error:', err);
      return res.status(500).json({
        status: 'error',
        message: 'Gagal menyimpan ke database',
        error: err
      });
    }

    res.status(201).json({
      status: 'success',
      message: 'File berhasil diupload dan data disimpan',
      data: {
        no_rawat,
        kode,
        lokasi_file
      }
    });
  });
});

router.post('/upload-draft', verifyToken, upload.single('file'), (req, res) => {
  const { no_rawat } = req.body;

  if (!req.file || !no_rawat) {
    return res.status(400).json({ status: 'error', message: 'Data tidak lengkap' });
  }

  const sanitizedNoRawat = no_rawat.replace(/\//g, '_');
  const draftDir = path.join(__dirname, '../../webapps/berkasrawat/pages/upload/draft');

  if (!fs.existsSync(draftDir)) fs.mkdirSync(draftDir, { recursive: true });

  const fileExtension = path.extname(req.file.originalname);
  const newFilename = `${sanitizedNoRawat}${fileExtension}`;
  const newPath = path.join(draftDir, newFilename);

  try {
    const possibleExt = ['.jpg', '.jpeg', '.png', '.pdf'];
    possibleExt.forEach(ext => {
      const possibleFile = path.join(draftDir, `${sanitizedNoRawat}${ext}`);
      if (fs.existsSync(possibleFile)) {
        fs.unlinkSync(possibleFile);
        console.log(`File lama dihapus: ${possibleFile}`);
      }
    });

    fs.copyFileSync(req.file.path, newPath);

    return res.status(200).json({ status: 'success', message: 'Draft berhasil disimpan' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Gagal menyimpan draft', error: err.message });
  }
});

router.post('/get-draft', verifyToken, upload.none(), (req, res) => {
  const { no_rawat } = req.body;

  if (!no_rawat) {
    return res.status(400).json({ status: 'error', message: 'no_rawat tidak ditemukan' });
  }

  const sanitizedNoRawat = no_rawat.replace(/\//g, '_');
  const draftDir = path.join(__dirname, '../../webapps/berkasrawat/pages/upload/draft');

  const possibleExt = ['.jpg', '.jpeg', '.png', '.pdf'];
  for (const ext of possibleExt) {
    const fileName = `${sanitizedNoRawat}${ext}`;
    const filePath = path.join(draftDir, fileName);

    if (fs.existsSync(filePath)) {
      const fileUrl = `http://114.30.92.12:8988/webapps/berkasrawat/pages/upload/draft/${fileName}`;
      return res.status(200).json({
        status: 'success',
        message: 'File ditemukan',
        file_url: fileUrl,
        file_name: fileName
      });
    }
  }

  return res.status(404).json({ status: 'error', message: 'File tidak ditemukan' });
});

module.exports = router;