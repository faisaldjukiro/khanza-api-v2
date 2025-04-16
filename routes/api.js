const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/verifyToken');

router.get('/pasien', verifyToken, (req, res) => {
  const query = `
    SELECT 
    a.no_rawat, 
    b.no_rkm_medis as nocm, 
    c.nm_pasien,
    TIMESTAMPDIFF(YEAR, c.tgl_lahir, CURDATE()) AS umur,
    CONCAT(e.kd_bangsal, ' - ', e.nm_bangsal) as kamar,
    a.stts_pulang
    FROM 
        kamar_inap a
    JOIN 
        reg_periksa b ON a.no_rawat = b.no_rawat
    JOIN 
        pasien c ON b.no_rkm_medis = c.no_rkm_medis
    JOIN 
        kamar d ON a.kd_kamar = d.kd_kamar
    JOIN 
        bangsal e ON d.kd_bangsal = e.kd_bangsal
    WHERE
        a.stts_pulang = '-' AND b.no_rkm_medis != 'XXXXXX'
    ORDER BY 
        a.tgl_masuk DESC
  `;

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

router.get('/list-berkas', verifyToken, (req, res) => {
  const { no_rawat } = req.body;
  const url = 'http://192.168.20.1/webapps/berkasrawat/'
  const query = `
     SELECT
        a.no_rawat,b.nama, CONCAT('${url}', a.lokasi_file) as url
      FROM
        berkas_digital_perawatan a
      JOIN
        master_berkas_digital b ON a.kode = b.kode
      WHERE a.no_rawat = ?
        `;
  db.query(query,[no_rawat], (err, results) => {
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
router.get('/validasitoken', verifyToken, (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Token masih valid',
    user: req.user
  });
});
module.exports = router;
