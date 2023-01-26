const exp = require('express');

const router = exp.Router();

router.get('/', (req, res, next) => {
    console.log('fetch get');
    res.status(200).send('Fetch successful');
});

module.exports = router;