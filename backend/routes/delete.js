const exp = require('express');
const { utils } = require('./utils.js');
const fbAdmin = require('firebase-admin');
const fs = require('fs');

const router = exp.Router();

router.delete('/', (req, res, next) => {
    const auth = utils.getAuth();
    if (auth.currentUser) {
        const lineToDelete = req.query.lineToDelete;
        if (!lineToDelete || !lineToDelete.length) {
            res.status(400).send('Missing line to delete in request.');
        }

        deleteLine(lineToDelete).then(success => {
            res.status(success ? 200 : 400).send(success ? '' : `Could not find line #${lineToDelete}`);
        });
    } else {
        res.status(403).send('Unauthorized');
    }
});

function deleteLine(lineNum) {
    if (!fbAdmin.apps.length) {
        utils.initFirebase();
    }

    const firestore = fbAdmin.apps[0].firestore();
    return firestore.collection('lines').where('line', '==', parseInt(lineNum, 10)).get().then((snapshot) => {
        let deleted = false;
        snapshot.forEach(doc => {
            doc.ref.delete();
            deleted = true;
        });
        return deleted;
    })
}

module.exports = router;