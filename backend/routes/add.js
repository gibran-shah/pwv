const exp = require('express');
const rsa = require('node-rsa');
const fbAdmin = require('firebase-admin');
const { utils } = require('./utils.js');

const router = exp.Router();

router.post('/', (req, res, next) => {
    const auth = utils.getAuth();
    if (auth.currentUser) {
        const content = req.body.content;
        const decodedContent = decodeContent(content);
        const encryptedContent = encrypt(decodedContent);
        getTotalLinesFromDatabase().then((totalLines) => {
            addContentToDatabase(encryptedContent.map(
                    (ec, i) => ({ line: totalLines + i + 1, content: ec })
                )).then(() => {
                    res.status(200).send('Add successful');
                }, (err) => {
                    res.status(500).send('Something went wrong when attempting to add content.');
                });
        }, (err) => {
            res.status(500).send('Something went wrong when attempting to add content.');
        });
    } else {
        res.status(403).send('Unauthorized');
    }
});

const decodeContent = (content) => {
    const array = content.split(',');
    const regex = /&comma;/g
    return array.map(c => c.replace(regex, ','));
};

const encrypt = (content) => {
    const encryptedContent = [];
    content.forEach((lineContent) => {
        const privateKey = 'MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGBAIVxwpKlP/DFPJZfMpQheCnwRm6H5PM0HXbNNkdb73CwT06X7+TT6xyBbqpmPVkdBzqn8sB3Z9mlKWFHrErl8iOdQ8QVuPPJRePwGmWYuavHk/qBJwypWIXwYgyAIljS55Hwv/PQpyKJLZU8uQXSCzWk3AsYY008OTxSmVpxRBENAgMBAAECgYAPhhRkiuTNVaSeuaRgpyQbfOA0q4pu4HktAOJ3mrJYIaqYMgSuUhjf0A7Xs90fKMlWgYMz8LAcGaKetn/MlsN8RfohX9UIHl1QbOiV7tD8z/I8Jzv0ycgwsDjOVwxv6f9/0nlDH30DWHPFF/PVcu2nCscCfwsCVIxYFttPPFlLAQJBAMopgQtA2A6qpEtNz+42C5Y15HcCRkqhU9m1DvVwDaz7d5HBqXzf9E8qu4Nf2eyKe9WdT/+3t2mUVVJ082EzbzUCQQCo+2RI2AJdNgR4tey4hNjXaPZK4PI7W8ey9y3mNFfTeVa+2y5dcamcW5RLLkdWfW+njcxakTa+irCheNCk3Z15AkEAhBGFKhLckwhLeJ6G3joUa7cdX9nujcbC/pDYCuN/K6jEPkZkMR4lfqqOAY9W0L7Pk4fHwWkFu0WaT9nzPWbamQJAXPz50pwLsP9otoRmH6P7L46y+cGPitqWqgUbXPKw4c6DzcMPYJyLmV9L25M77nxYVPvS2IPQfEoVqMWzCwZpAQJAPAP6u1oT7H+ZFO6DFUJlirNEc3+JhULCu97+JntaCnTpYFyRjQm9KFxdeTfVpTvLSgF2rz67YExqKS78r+jkZA==';
        const key = new rsa(`${privateKey}`, 'pkcs8');
        encryptedContent.push(key.encrypt(lineContent, 'base64'));
    });
    return encryptedContent;
};

const getTotalLinesFromDatabase = () => {
    if (!fbAdmin.apps.length) {
        utils.initFirebase();
    }

    const firestore = fbAdmin.apps[0].firestore();
    return firestore.collection('lines').get()
        .then(snapshot => snapshot.docs.length);
};

const addContentToDatabase = (records) => {
    if (!fbAdmin.apps.length) {
        utils.initFirebase();
    }

    const firestore = fbAdmin.apps[0].firestore();
    const batch = firestore.batch();
    records.forEach(r => {
        const docRef = firestore.collection('lines').doc();
        batch.set(docRef, r);
    });
    return batch.commit();
};

module.exports = router;