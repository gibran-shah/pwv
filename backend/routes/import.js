const fs = require('fs');
const exp = require('express');

const router = exp.Router();

router.get('/', (req, res, next) => {
    fs.readFile(process.env.IMPORT_FILE, 'utf8', (err, data) => {
        if (err) {
            console.log(`err: ${JSON.stringify(err)}`);
            res.status(500).send('Can\'t read file');
            return;
        }

        const dataArray = data.split('\r\n');
        for (let i = 0; i < dataArray.length; i++) {
            console.log(`dataArray[${i}]: ${JSON.stringify(dataArray[i])}`);
        }

        res.status(200).send('Import successful');
    });
});

module.exports = router;