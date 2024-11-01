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

router.patch('/swap', (req, res, next) => {
    const auth = utils.getAuth();
    if (auth.currentUser) {
        const { lineNum1, lineNum2 } = req.query;
        let lineNum1Int = parseInt(lineNum1, 10);
        let lineNum2Int = parseInt(lineNum2, 10);
        if (
            (lineNum1Int === lineNum2Int + 1 || lineNum1Int === lineNum2Int - 1)
            && (lineNum1Int > 0 && lineNum2Int > 0)
        ) {
            if (lineNum1Int > lineNum2Int) {
                lineNum2Int = lineNum1Int;
                lineNum1Int--;
            }
            swap(lineNum1Int, lineNum2Int);
            res.status(200).send();
        } else {
            res.status(400).send('Invalid line numbers');
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

function swap(lineNum1, lineNum2) {
    if (!fbAdmin.apps.length) {
        utils.initFirebase();
    }

    const firestore = fbAdmin.apps[0].firestore();
    const batch = firestore.batch();
    return firestore.collection('lines')
        .where('line', '>=', lineNum1)
        .where('line', '<=', lineNum2)
        .get().then(snapshot => {
            const lines = [];
            snapshot.forEach(doc => lines.push({
                doc,
                data: doc.data()
            }));
            const tempLineNum = lines[0].data.line;
            lines[0].data.line = lines[1].data.line;
            lines[1].data.line = tempLineNum;
            batch.set(lines[0].doc.ref, lines[0].data);
            batch.set(lines[1].doc.ref, lines[1].data);
            return batch.commit();
        });
}

module.exports = router;