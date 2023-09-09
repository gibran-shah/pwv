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
        let line = null;
        snapshot.forEach(doc => {
            line = {
                data: doc.data(),
                id: doc.id
            };
            doc.ref.delete();
        });
        if (!line) {
            res.status(500).send('Failed to delete line.');
        } else {
            return line;
        }
    }).then(line => {
        if (line) {
            return firestore.collection('indexes').get().then(snapshot => {
                let batch = firestore.batch();
                snapshot.forEach(doc => {
                    const d = doc.data();
                    const decryptedContent = utils.decrypt(line.data.content);
                    if (decryptedContent.includes(d.searchString)) {
                        for (let i = 0; i < d.lineIds.length; i++) {
                            const lineId = d.lineIds[i];
                            const decryptedLineId = utils.decrypt(lineId);
                            if (decryptedLineId === line.id) {
                                d.lineIds.splice(i, 1);
                                batch.set(doc.ref, d);
                                i--;
                            }
                        }
                    }
                });
                batch.commit();
                return line;
            });
        } else {
            return null;
        }
    }).then(line => {
        if (line) {
            return firestore.collection('lines')
                .where('line', '>', line.data.line)
                .get().then(snapshot => {
                    let batch = firestore.batch();
                    snapshot.forEach(doc => {
                        const d = doc.data();
                        d.line--;
                        batch.set(doc.ref, d);
                    });
                    return batch.commit();
                });
        } else {
            return null;
        }
    });
}

module.exports = router;