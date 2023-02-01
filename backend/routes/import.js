const fs = require('fs');
const exp = require('express');
const fbAdmin = require('firebase-admin');

const router = exp.Router();

router.get('/', (req, res, next) => {
    try {
        initFirebase();
        const fileRows = getFileRows();
        storeFileRows(fileRows);
        res.status(200);
    } catch (err) {
        console.log(`err = ${JSON.stringify(err)}`);
        fs.appendFileSync('log.txt', new Date().toString() + ': in import.js : router.get : err = ' + err + '\n');
        res.status(500).send('Something went wrong when trying to import passwords.');
    }
});

const initFirebase = function() {
    if (!fbAdmin.apps.length) {
        const serviceAccount = require(process.env.SERVICE_ACCOUNT_FILE_PATH);
        fbAdmin.initializeApp({
            credential: fbAdmin.credential.cert(serviceAccount),
            databaseURL: process.env.DB_URL
        });
        fs.appendFileSync('log.txt', new Date().toString() + ': in import.js : router.post : Firebase Admin initialized.\n');
    }
}

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

module.exports = router;