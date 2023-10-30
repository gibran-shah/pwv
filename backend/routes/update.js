const exp = require('express');
const fbAdmin = require('firebase-admin');
const { utils } = require('./utils.js');

const router = exp.Router();

router.patch('/', (req, res, next) => {
    const auth = utils.getAuth();
    if (auth.currentUser) {
        const lineNum = req.query.lineNum;
        if (!lineNum || !lineNum.length) {
            res.status(400).send('Missing line to update in request.');
        } else if (isNaN(parseInt(lineNum, 10))) {
            res.status(400).send(`Invalid line number: ${lineNum}`);
        } else {
            const lineContent = req.query.lineContent;
            update(lineNum, lineContent).then(
                () => res.status(200).send()
            );
        }
    } else {
        res.status(403).send('Unauthorized');
    }
});

function update(lineNum, lineContent) {
    if (!fbAdmin.apps.length) {
        utils.initFirebase();
    }

    const firestore = fbAdmin.apps[0].firestore();
    return firestore.collection('lines').where('line', '==', parseInt(lineNum, 10)).get().then((snapshot) => {
        if (!snapshot.size) {
            res.status(500).send('Could not find line to update.');
        }
        const encryptedLine = utils.encrypt(lineContent);
        let lineId;
        snapshot.forEach(doc => {
            lineId = doc.id;
            doc.ref.update({ content: encryptedLine });
        });
        return { lineId, lineNum, lineContent };
    }).then(lineInfo => {
        if (lineInfo) {
            return firestore.collection('indexes').get().then(snapshot => {
                let batch = firestore.batch();
                snapshot.forEach(doc => {
                    const d = doc.data();
                    let lineFound = false;
                    for (let i = 0; i < d.lineIds.length; i++) {
                        const decryptedLineId = utils.decrypt(d.lineIds[i]);
                        if (decryptedLineId === lineInfo.lineId) {
                            if (!lineInfo.lineContent.includes(d.searchString)) {
                                d.lineIds.splice(i, 1);
                                batch.set(doc.ref, d);
                                i--;
                            }
                            lineFound = true;
                            break;
                        }
                    }
                    if (!lineFound && lineInfo.lineContent.includes(d.searchString)) {
                        d.lineIds.push(utils.encrypt(lineInfo.lineId));
                        batch.set(doc.ref, d);
                    }                    
                });
                batch.commit();
                return lineInfo;
            });
        } else {
            return null;
        }
    });
}

module.exports = router;