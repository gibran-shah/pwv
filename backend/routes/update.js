const exp = require('express');
const fbAdmin = require('firebase-admin');
const { utils } = require('./utils.js');

const router = exp.Router();

router.patch('/', (req, res, next) => {
    console.log('hello');
    res.send(200);
});

module.exports = router;