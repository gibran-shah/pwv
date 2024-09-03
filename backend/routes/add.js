const exp = require('express');
const fbAdmin = require('firebase-admin');
const { utils } = require('./utils.js');

const router = exp.Router();

router.post('/', (req, res, next) => {
    const auth = utils.getAuth();
    if (auth.currentUser) {
        const lineNum = req.body.lineNum;
        const content = req.body.content;
        const decodedContent = decodeContent(content);
        const encryptedContent = encrypt(decodedContent);

        const addContentFunction = (encryptedContent, lineNum) => {
            return addContentToDatabase(encryptedContent.map(
                (ec, i) => ({ line: lineNum + i + 1, content: ec })
            )).then(
                newLines => updateIndexes(newLines)
            ).catch(
                err => res.status(500).send('Something went wrong when attempting to add content.')
            );
        }

        if (lineNum) {
            const lineNumParsed = parseInt(lineNum, 10);
            incrementLineNumbersAfter(lineNumParsed).then(
                () => addContentFunction(encryptedContent, lineNumParsed)
            ).then(
                () => res.status(200).send('Add successful')
            ).catch(
                (err) => res.status(500).send('Something went wrong when attempting to add content.')
            )
        } else {
            getTotalLinesFromDatabase().then(
                (totalLines) => addContentFunction(encryptedContent, totalLines)
            ).then(
                () => res.status(200).send('Add successful')
            ).catch(
                (err) => res.status(500).send('Something went wrong when attempting to add content.')
            );
        }
    } else {
        res.status(403).send('Unauthorized');
    }
});

const incrementLineNumbersAfter = (lineNum) => {
    if (!fbAdmin.apps.length) {
        utils.initFirebase();
    }

    const firestore = fbAdmin.apps[0].firestore();
    return firestore.collection('lines').where('line', '>', lineNum).get()
        .then(snapshot => {
            const batch = firestore.batch();
            snapshot.docs.forEach(doc => {
                const line = doc.data();
                line.line++;
                batch.set(doc.ref, line);
            });
            return batch.commit();
        });
}

const updateIndexes = (newLines) => {
    if (!fbAdmin.apps.length) {
        utils.initFirebase();
    }

    const firestore = fbAdmin.apps[0].firestore();
    return firestore.collection('indexes').get()
        .then(snapshot => {
            const updatedIndexes = [];
            snapshot.docs.forEach(doc => {
                const index = doc.data();
                index.id = doc.id;
                const matchingLines = [];
                for (let i = 0; i < newLines.length; i++) {
                    const decryptedLine = utils.decrypt(newLines[i].content);
                    if (decryptedLine.includes(index.searchString)) {
                        matchingLines.push(newLines[i]);
                    }
                }
                for (let i = 0; i < matchingLines.length; i++) {
                    const encryptedId = utils.encrypt(matchingLines[i].id);
                    index.lineIds.push(encryptedId);
                }
                if (matchingLines.length) {
                    updatedIndexes.push(index);
                }
            });

            const batch = firestore.batch();
            for (let i = 0; i < updatedIndexes.length; i++) {
                const index = updatedIndexes[i];
                const indexId = index.id;
                delete index.id;
                const indexRef = firestore.collection('indexes').doc(indexId);
                batch.set(indexRef, index);
            }
            return batch.commit();
        });
};

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
    const newLines = [];
    records.forEach(r => {
        const docRef = firestore.collection('lines').doc();
        batch.set(docRef, r);
        newLines.push({
            lineNum: r.line,
            content: r.content,
            id: docRef.id
        });
    });
    return batch.commit().then(() => newLines);
};

module.exports = router;