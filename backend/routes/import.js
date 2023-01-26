const exp = require('express');

const router = exp.Router();

router.get('/', (req, res, next) => {
    console.log('import get');
    res.status(200).send('Import successful');
});

module.exports = router;