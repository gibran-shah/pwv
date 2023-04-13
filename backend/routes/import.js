const fs = require('fs');
const exp = require('express');
const fbAdmin = require('firebase-admin');
const { utils } = require('./utils.js');

const router = exp.Router();

router.get('/', async (req, res, next) => {
    try {
        utils.initFirebase();
        const totalLines = await getTotalLinesFromDatabase();
        if (!totalLines) {
            const fileRows = getFileRows();
            const encryptedFileRows = encryptFileRows(fileRows);
            storeFileRows(encryptedFileRows);
            res.status(200).send();
        } else {
            res.status(500).send('Cannot import. Database not empty.');
        }
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
    let batch = firestore.batch();
    for (let i = 0; i < payload.length; i++) {
        const docRef = firestore.collection('lines').doc();
        batch.set(docRef, payload[i]);
        if (i % 500 === 0) {
            batch.commit();
            batch = firestore.batch();
        }
    }

    batch.commit();
}

const encryptFileRows = function(fileRows) {
    const encryptedRows = [];
    const key = utils.getRsaKey();
    fileRows.forEach((row) => encryptedRows.push(key.encrypt(row, 'base64')));
    return encryptedRows;
}

const getTotalLinesFromDatabase = async function() {
    if (!fbAdmin.apps.length) {
        utils.initFirebase();
    }

    const firestore = fbAdmin.apps[0].firestore();
    const snapshot = await firestore.collection('lines').get();
    return snapshot.docs.length;
};

module.exports = router;