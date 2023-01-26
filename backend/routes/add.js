const exp = require('express');

const router = exp.Router();

router.post('/', (req, res, next) => {
    console.log('add post');
    res.status(200).send('Add successful');
});

module.exports = router;