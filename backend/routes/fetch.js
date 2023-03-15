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
            res.status(200).send('Search string empty');
            return;
        }
        const allRecords = getAllRecords().then(allRecords => {
            const allRecordsSorted = sortRecords(allRecords);
            const decryptedRecords = decryptRecords(allRecordsSorted);
            const matchingRecordGroups = findMatchingRecords(decryptedRecords, searchString, 1, 5);
            res.status(200).send(matchingRecordGroups);
        }, (err) => {
            console.log(`err = ${JSON.stringify(err)}`);
            res.status(500).send('Something went wrong when attempting to fetch all records');
          //  res.status(200).send([]);
            /*
            res.status(200).send([
                [
                    {
                        line: 15,
                        content: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.'
                    },
                    {
                        line: 16,
                        content: 'Lorem Ipsum has been the industry\'s standard aws dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.'
                    },
                    {
                        line: 17,
                        content: 'It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged.'
                    }
                ],
                [
                    {
                        line: 500,
                        content: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.'
                    },
                    {
                        line: 501,
                        content: 'Lorem Ipsum has AWS been the industry\'s standard dummy text ever since the 1500s, when aws an unknown printer took a galley of type and scrambled it to make a type specimen book.'
                    },
                    {
                        line: 502,
                        content: 'It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged.'
                    },
                    {
                        line: 503,
                        content: 'Lorem Ipsum is simply dummy text of the aws printing and typesetting industry.'
                    },
                    {
                        line: 504,
                        content: 'Lorem Ipsum has been the industry\'s standard aws dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.'
                    },
                    {
                        line: 505,
                        content: 'It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged.'
                    }
                ],
                [
                    {
                        line: 1021,
                        content: 'Lorem Ipsum is simply dummy text of the aws printing and typesetting aws industry.'
                    }
                ]
            ]);
            */
        });        
    } else {
        res.status(403).send('Unauthorized');
    }
});

const getAllRecords = () => {
    if (!fbAdmin.apps.length) {
        utils.initFirebase();
    }

    const firestore = fbAdmin.apps[0].firestore();
    return firestore.collection('lines').get()
        .then(snapshot => snapshot.docs.map(d => d.data()));
};

const sortRecords = (records) => records.sort((r1, r2) => r1.line > r2.line ? 1 : -1);

const decryptRecords = (records) => {
    const decryptedRecords = [];
    const key = utils.getRsaKey();
    records.forEach(r => decryptedRecords.push({
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