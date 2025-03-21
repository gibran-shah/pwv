const exp = require('express');
const { utils } = require('./utils.js');
const fbAdmin = require('firebase-admin');
const util = require('util');
const fs = require('fs');

const router = exp.Router();

router.get('/', (req, res, next) => {
    const auth = utils.getAuth();
    if (auth.currentUser) {
        const searchString = req.query.searchString.trim();
        if (!searchString || !searchString.length) {
            res.status(400).send('Search string empty');
            return;
        }

        let hasIndexes = false;
        const result = {};
        getIndexes(searchString).then(indexes => {
            hasIndexes = !!indexes.length;
            if (hasIndexes) {
                return searchByIndex(indexes, 1, 5);
            } else {
                return searchAllRecords(searchString)
            }
        }).then(recordGroups => {
            !hasIndexes && createIndexes(recordGroups, searchString);
            result.recordGroups = recordGroups;
            return getTotalLines();
        }).then(totalLines => {
            result.totalLines = totalLines._data.count;
            res.status(200).send(result);
        }).catch ((err) => {
            console.log(`err = ${JSON.stringify(err)}`);
            res.status(500).send('Something went wrong when attempting to fetch records');
        });        
    } else {
        res.status(403).send('Unauthorized');
    }
});

router.get('/byLineNum', (req, res) => {
    const auth = utils.getAuth();
    if (auth.currentUser) {
        if (!fbAdmin.apps.length) {
            utils.initFirebase();
        }

        const lineNum = parseInt(req.query.lineNum);
        const count = parseInt(req.query.count);
        const direction = req.query.direction;

        const firestore = fbAdmin.apps[0].firestore();
        const lineCollection = firestore.collection('lines');
        lineCollection.count().get().then(snapshot => {
            const totalLines = snapshot.data().count;
            const rangeStart = direction === 'before'
                ? (lineNum <= 1 ? 0 : (count >= lineNum ? 1 : lineNum - count))
                : (lineNum < totalLines ? lineNum + 1 : lineNum);
            const rangeEnd = direction === 'before'
                ? (lineNum > 1 ? lineNum - 1 : 0)
                : (lineNum + count > totalLines ? totalLines : lineNum + count);
            if ((direction === 'before' && rangeEnd === 0)
              || (direction === 'after' && rangeStart === lineNum)) {
                res.send([]);
            } else {
                lineCollection
                    .where('line', '>=', rangeStart)
                    .where('line', '<=', rangeEnd)
                    .get().then(recordsSnapshot => {
                        const key = utils.getRsaKey();
                        const decryptedRecords = [];
                        recordsSnapshot.forEach(record => {
                            const data = record.data();
                            data.content = key.decrypt(data.content, 'utf8');
                            decryptedRecords.push(data);
                        });
                        const sortedRecords = decryptedRecords.sort((r1, r2) => r1.line > r2.line ? 1 : -1);
                        res.send(sortedRecords);
                    });
            }
        });
        
    }
});

const createIndexes = (recordGroups, searchString) => {
// https://firebase.google.com/docs/firestore/query-data/queries#node.js
    if (!fbAdmin.apps.length) {
        utils.initFirebase();
    }

    const firestore = fbAdmin.apps[0].firestore();
    const indexesRef = firestore.collection('indexes');

    const idsToIndex = getIdsToIndex(recordGroups, searchString);
    const encryptedIdsToIndex = encryptIdsToIndex(idsToIndex);

    return indexesRef.doc().set({
        searchString: searchString.toLowerCase(),
        lineIds: encryptedIdsToIndex
    }).then(() => recordGroups.map(rg => rg.map(r => ({
        line: r.line,
        content: r.content
    }))));
};

const getIdsToIndex = (recordGroups, searchString) => {
    const idsToIndex = [];
    for (let i = 0; i < recordGroups.length; i++) {
        const group = recordGroups[i];
        for (let j = 0; j < group.length; j++) {
            if (group[j].content.toLowerCase().includes(searchString.toLowerCase())) {
                idsToIndex.push(group[j].id);
            }
        }
    }

    return idsToIndex;
};

const encryptIdsToIndex = (idsToIndex) => {
    const key = utils.getRsaKey();
    return idsToIndex.map(id => key.encrypt(id, 'base64'));
};

const decryptIndexedIds = (indexedIds) => {
    const key = utils.getRsaKey();
    const decryptedIds = indexedIds.map(id => key.decrypt(id, 'utf8'));
    return decryptedIds;
}

const getIndexes = (searchString) => {
    if (!fbAdmin.apps.length) {
        utils.initFirebase();
    }

    const firestore = fbAdmin.apps[0].firestore();
    const indexesRef = firestore.collection('indexes');
    const queryRef = indexesRef.where('searchString', '==', searchString.toLowerCase());
    return queryRef.get().then(snapshot =>
        snapshot.empty ? [] : decryptIndexedIds(snapshot.docs[0].data().lineIds)
    );
}

const searchByIndex = async (indexes, frontRange = 0, backRange = 0) => {
    if (!fbAdmin.apps.length) {
        utils.initFirebase();
    }

    const firestore = fbAdmin.apps[0].firestore();
    const lineCollection = firestore.collection('lines');
    const key = utils.getRsaKey();

    // Prepare data
    let lineData = [];
    const docs = await lineCollection.where('__name__', 'in', indexes).get();
    docs.forEach(doc => lineData.push(doc.data()));
    lineData = lineData.sort((ld1, ld2) => ld1.line > ld2.line ? 1 : -1);

    let currentGroup = []; // for each iteration
    const recordGroups = []; // accumulator
    for (let i = 0; i < lineData.length; i++) {
        // figure out range of lines to get:
        let startLine = lineData[i].line - frontRange;
        let endLine = lineData[i].line + backRange;

        // figure out if we should continue with current group or start a new group:
        if (currentGroup.length) {
            const nextLine = currentGroup[currentGroup.length - 1].line + 1;
            if (lineData[i].line <= nextLine) {
                startLine = nextLine;
            } else {
                recordGroups.push(currentGroup);
                currentGroup = [];
            }
        }

        // get lines for current group:
        const group = await lineCollection.where('line', '>=', startLine).where('line', '<=', endLine).get();
        group.forEach(g => {
            const record = g.data();
            record.content = key.decrypt(record.content, 'utf8');
            currentGroup.push(record);
        });
    }

    recordGroups.push(currentGroup);
    const mergedGroups = mergeRecords(recordGroups);
    return mergedGroups;
};

const searchAllRecords = async (searchString) => {
    return getAllRecords().then(allRecords => {
        const allRecordsSorted = sortRecords(allRecords);
        const decryptedRecords = decryptRecords(allRecordsSorted);
        const matchingRecordGroups = findMatchingRecords(decryptedRecords, searchString, 1, 5);
        const mergedRecordGroups = mergeRecords(matchingRecordGroups);
        return mergedRecordGroups;
    });  
}

const getAllRecords = () => {
    if (!fbAdmin.apps.length) {
        utils.initFirebase();
    }

    const firestore = fbAdmin.apps[0].firestore();
    return firestore.collection('lines').get()
        .then(snapshot => snapshot.docs.map(d => Object.assign({ id: d.id }, d.data())));
};

const sortRecords = (records) => records.sort((r1, r2) => r1.line > r2.line ? 1 : -1);

const decryptRecords = (records) => {
    const decryptedRecords = [];
    const key = utils.getRsaKey();
    records.forEach(r => decryptedRecords.push({
        id: r.id,
        line: r.line,
        content: key.decrypt(r.content, 'utf8')
    }));
    return decryptedRecords;
};

const findMatchingRecords = (records, searchString, frontRange = 0, backRange = 0) => {
    const matchingRecordGroups = [];
    for (let i = 0; i < records.length; i++) {
        const r = records[i];
        if (r.content.toLowerCase().includes(searchString.toLowerCase())) {
            const recordGroup = [];
            // Gather range of records just before matching record
            if (frontRange) {
                let fr_start = i - frontRange;
                while (fr_start < 0) fr_start++;
                for (let fr_i = fr_start; fr_i < i; fr_i++) {
                    recordGroup.push(records[fr_i]);
                } 
            }
            // Add matching record
            recordGroup.push(r);
            // Gather range of records just after matching record
            if (backRange) {
                let br_end = i + backRange;
                while (br_end >= records.length) {
                    br_end--;
                }
                let recordsSinceLastMatch = 0;
                for (let br_i = i + 1; br_i <= br_end; br_i++) {
                    recordsSinceLastMatch++;
                    recordGroup.push(records[br_i]);
                    if (records[br_i].content.toLowerCase().includes(searchString.toLowerCase())) {
                        br_end += recordsSinceLastMatch;
                        br_end = br_end >= records.length ? records.length - 1 : br_end;
                        i = br_i;
                        recordsSinceLastMatch = 0;
                    }
                } 
            }
            matchingRecordGroups.push(recordGroup);
        }
    }
    return matchingRecordGroups;
};

const mergeRecords = (recordGroups) => {
    for (let i = 0; i < recordGroups.length - 1; i++) {
        let group1 = recordGroups[i];
        const group2 = recordGroups[i+1];
        const lastRecordInGroup1 = group1[group1.length - 1];
        const firstRecordInGroup2 = group2[0];

        if (lastRecordInGroup1.line >= firstRecordInGroup2.line - 1) {
            let currentRecordInGroup2 = firstRecordInGroup2;
            while (currentRecordInGroup2.line <= lastRecordInGroup1.line) {
                group2.splice(0, 1);
                currentRecordInGroup2 = group2[0];
            }
            recordGroups[i] = group1.concat(group2);
            recordGroups.splice(i+1, 1);
            i--;
        }
    }
    return recordGroups;
}

const getTotalLines = async () => {
    if (!fbAdmin.apps.length) {
        utils.initFirebase();
    }

    const firestore = fbAdmin.apps[0].firestore();
    return await firestore.collection('lines').count().get();
};

module.exports = router;