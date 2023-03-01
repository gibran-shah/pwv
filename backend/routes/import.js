const fs = require('fs');
const rsa = require('node-rsa');
const exp = require('express');
const fbAdmin = require('firebase-admin');
const { utils } = require('./utils.js');

const router = exp.Router();

router.get('/', (req, res, next) => {
    try {
        utils.initFirebase();
        const fileRows = getFileRows();
        const encryptedFileRows = encryptFileRows(fileRows);
        storeFileRows(encryptedFileRows);
        res.status(200);
    } catch (err) {
        console.log(`err = ${JSON.stringify(err)}`);
        fs.appendFileSync('log.txt', new Date().toString() + ': in import.js : router.get : err = ' + err + '\n');
        res.status(500).send('Something went wrong when trying to import passwords.');
    }
});

const getFileRows = function() {
    const buffer = fs.readFileSync(process.env.IMPORT_FILE);
    const rows = buffer.toString().split('\r\n');
    if (!rows.length) {
        console.log('No rows in file.');
        fs.appendFileSync('log.txt', new Date().toString() + ': in import.js : router.get : no rows in file\n');
        throw new Error('No rows in file.');
    }
    return rows;
}

const storeFileRows = function(fileRows) {
    const payload = fileRows.map((r, i) => ({
        line: i + 1,
        content: r
    }));

    const firestore = fbAdmin.apps[0].firestore();
    const batch = firestore.batch();

    for (let i = 0; i < payload.length; i++) {
        const docRef = firestore.collection('lines').doc();
        batch.set(docRef, payload[i]);
    }

    batch.commit();
}

const encryptFileRows = function(fileRows) {
    const encryptedRows = [];
    fileRows.forEach((row) => {
        const privateKey = 'MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGBAIVxwpKlP/DFPJZfMpQheCnwRm6H5PM0HXbNNkdb73CwT06X7+TT6xyBbqpmPVkdBzqn8sB3Z9mlKWFHrErl8iOdQ8QVuPPJRePwGmWYuavHk/qBJwypWIXwYgyAIljS55Hwv/PQpyKJLZU8uQXSCzWk3AsYY008OTxSmVpxRBENAgMBAAECgYAPhhRkiuTNVaSeuaRgpyQbfOA0q4pu4HktAOJ3mrJYIaqYMgSuUhjf0A7Xs90fKMlWgYMz8LAcGaKetn/MlsN8RfohX9UIHl1QbOiV7tD8z/I8Jzv0ycgwsDjOVwxv6f9/0nlDH30DWHPFF/PVcu2nCscCfwsCVIxYFttPPFlLAQJBAMopgQtA2A6qpEtNz+42C5Y15HcCRkqhU9m1DvVwDaz7d5HBqXzf9E8qu4Nf2eyKe9WdT/+3t2mUVVJ082EzbzUCQQCo+2RI2AJdNgR4tey4hNjXaPZK4PI7W8ey9y3mNFfTeVa+2y5dcamcW5RLLkdWfW+njcxakTa+irCheNCk3Z15AkEAhBGFKhLckwhLeJ6G3joUa7cdX9nujcbC/pDYCuN/K6jEPkZkMR4lfqqOAY9W0L7Pk4fHwWkFu0WaT9nzPWbamQJAXPz50pwLsP9otoRmH6P7L46y+cGPitqWqgUbXPKw4c6DzcMPYJyLmV9L25M77nxYVPvS2IPQfEoVqMWzCwZpAQJAPAP6u1oT7H+ZFO6DFUJlirNEc3+JhULCu97+JntaCnTpYFyRjQm9KFxdeTfVpTvLSgF2rz67YExqKS78r+jkZA==';
        const key = new rsa(`${privateKey}`, 'pkcs8');
        encryptedRows.push(key.encrypt(row, 'base64'));
    });
    return encryptedRows;
}

module.exports = router;