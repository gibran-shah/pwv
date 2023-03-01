const exp = require('express');
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
    const key = utils.getRsaKey();
    content.forEach((lineContent) => encryptedContent.push(key.encrypt(lineContent, 'base64')));
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