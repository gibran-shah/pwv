const exp = require('express');
const { utils } = require('./utils.js');
const fbAdmin = require('firebase-admin');
const rsa = require('node-rsa');
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
    const privateKey = 'MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGBAIVxwpKlP/DFPJZfMpQheCnwRm6H5PM0HXbNNkdb73CwT06X7+TT6xyBbqpmPVkdBzqn8sB3Z9mlKWFHrErl8iOdQ8QVuPPJRePwGmWYuavHk/qBJwypWIXwYgyAIljS55Hwv/PQpyKJLZU8uQXSCzWk3AsYY008OTxSmVpxRBENAgMBAAECgYAPhhRkiuTNVaSeuaRgpyQbfOA0q4pu4HktAOJ3mrJYIaqYMgSuUhjf0A7Xs90fKMlWgYMz8LAcGaKetn/MlsN8RfohX9UIHl1QbOiV7tD8z/I8Jzv0ycgwsDjOVwxv6f9/0nlDH30DWHPFF/PVcu2nCscCfwsCVIxYFttPPFlLAQJBAMopgQtA2A6qpEtNz+42C5Y15HcCRkqhU9m1DvVwDaz7d5HBqXzf9E8qu4Nf2eyKe9WdT/+3t2mUVVJ082EzbzUCQQCo+2RI2AJdNgR4tey4hNjXaPZK4PI7W8ey9y3mNFfTeVa+2y5dcamcW5RLLkdWfW+njcxakTa+irCheNCk3Z15AkEAhBGFKhLckwhLeJ6G3joUa7cdX9nujcbC/pDYCuN/K6jEPkZkMR4lfqqOAY9W0L7Pk4fHwWkFu0WaT9nzPWbamQJAXPz50pwLsP9otoRmH6P7L46y+cGPitqWqgUbXPKw4c6DzcMPYJyLmV9L25M77nxYVPvS2IPQfEoVqMWzCwZpAQJAPAP6u1oT7H+ZFO6DFUJlirNEc3+JhULCu97+JntaCnTpYFyRjQm9KFxdeTfVpTvLSgF2rz67YExqKS78r+jkZA==';
    const key = new rsa(`${privateKey}`, 'pkcs8');
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