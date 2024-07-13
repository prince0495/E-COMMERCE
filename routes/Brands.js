const express = require('express');
const { fetchBrands, createBrands } = require('../controller/Brand')

const router = express.Router();
// /brands is already added in base path 
router.get('/', fetchBrands).post('/', createBrands)

exports.router = router;