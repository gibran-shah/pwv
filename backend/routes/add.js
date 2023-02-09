const exp = require('express');
const { utils } = require('./utils.js');

const router = exp.Router();

router.post('/', (req, res, next) => {
    console.log('add post');

    const auth = utils.getAuth();

    res.status(200).send('Add successful');
});

module.exports = router;