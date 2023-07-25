const fs = require('fs');
const rsa = require('node-rsa');
const fa = require('firebase/auth');
const fapp = require('firebase/app');
const fbAdmin = require('firebase-admin');

const utils = {
    getAuth: () => {
        const app = getAppByApiKey();
        return fa.getAuth(app);
    },

    initFirebase: () => {
        initializeFirebase();
    },

    getRsaKey: () => new rsa(`${process.env.SECRET_RSA_KEY}`, 'pkcs8'),

    decrypt: (content) => utils.getRsaKey().decrypt(content, 'utf8'),

    encrypt: (content) => utils.getRsaKey().encrypt(content, 'base64')
}

const getAppByApiKey = function() {
    return fapp.initializeApp({
        apiKey: "AIzaSyByzTZsxr-ZKD0jxGXPkxKzeBLXHoF21OU",
        authDomain: "mypwv-79723.firebaseapp.com",
        projectId: "mypwv-79723",
        storageBucket: "mypwv-79723.appspot.com",
        messagingSenderId: "5063626939",
        appId: "1:5063626939:web:826dc2f9e84f100187599e",
        measurementId: "G-MKRJZXLTBB"
    });
}

const initializeFirebase = function() {
    if (!fbAdmin.apps.length) {
        const serviceAccount = require(process.env.SERVICE_ACCOUNT_FILE_PATH);
        fbAdmin.initializeApp({
            credential: fbAdmin.credential.cert(serviceAccount),
            databaseURL: process.env.DB_URL
        });
        fs.appendFileSync('log.txt', new Date().toString() + ': in import.js : router.post : Firebase Admin initialized.\n');
    }
}

module.exports = { utils };