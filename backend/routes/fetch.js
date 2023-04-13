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

        const index = false; //getIndex(searchString);
        if (index) {
            searchByIndex(index);
        } else {
            searchAllRecords(searchString).then((recordGroups) => {
                return createIndexes(recordGroups, searchString);
            }).then((recordGroups) => {
                res.status(200).send(recordGroups);
            }).catch ((err) => {
                console.log(`err = ${JSON.stringify(err)}`);
                res.status(500).send('Something went wrong when attempting to fetch all records');
            });
        }      
    } else {
        res.status(403).send('Unauthorized');
    }
});

const createIndexes = (recordGroups, searchString) => {
// https://firebase.google.com/docs/firestore/query-data/queries#node.js
    if (!fbAdmin.apps.length) {
        utils.initFirebase();
    }

    const firestore = fbAdmin.apps[0].firestore();
    const indexesRef = firestore.collection('indexes');

    return indexesRef.doc().set({
        searchString,
        lineIds: getIdsToIndex(recordGroups, searchString)
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
                idsToIndex.push(group[j].line);
            }
        }
    }

    return idsToIndex;
};

const getIndex = (searchString) => {
    if (!fbAdmin.apps.length) {
        utils.initFirebase();
    }

    // const firestore = fbAdmin.apps[0].firestore();
    // const indexesRef = firestore.collection('indexes');
    // const q = query(indexesRef, where('searchString', '==', true));
}

const searchByIndex = (index) => {
    if (!fbAdmin.apps.length) {
        utils.initFirebase();
    }

    // const firestore = fbAdmin.apps[0].firestore();
    // return firestore.collection('indexes').get()
    //     .then(snapshot => snapshot.docs.map(d => d.data()));
};

const searchAllRecords = async (searchString) => {
    return getAllRecords().then(allRecords => {
        const allRecordsSorted = sortRecords(allRecords);
        const decryptedRecords = decryptRecords(allRecordsSorted);
        const matchingRecordGroups = findMatchingRecords(decryptedRecords, searchString, 1, 5);
        return matchingRecordGroups;
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

module.exports = router;