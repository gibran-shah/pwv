const fa = require('firebase/auth');
const fapp = require('firebase/app');
const fs = require('fs');
const exp = require('express');
const fbAdmin = require('firebase-admin');
const { utils } = require('./utils.js');

const router = exp.Router();

router.post('/signin', (req, res, next) => {
    const {
        username,
        password
    } = req.body;

  //  initFirebase();

    const auth = utils.getAuth();

    fa.signInWithEmailAndPassword(auth, username, password)
        .then((userCredentials) => {
            const {
                accessToken,
                expirationTime
            } = userCredentials.user.stsTokenManager;
            console.log('success!');
            res.status(200).send({accessToken, expirationTime});
        }).catch((err) => {
            console.log(JSON.stringify(err));
            res.status(500).send('failed to sign in');
        });
});

router.post('/signout', (req, res, next) => {
    const auth = utils.getAuth();

    fa.signOut(auth).then(() => {
        res.status(200).send('success!');
    }).catch((err) => {
        console.log(JSON.stringify(err));
        res.status(500).send('failed to sign out');
    });
});

router.post('/', (req, res, next) => {

    res.status(500).send('Not implemented');

    /*
    console.log('point 1');
    const app = fapp.initializeApp({
        apiKey: "AIzaSyByzTZsxr-ZKD0jxGXPkxKzeBLXHoF21OU",
        authDomain: "mypwv-79723.firebaseapp.com",
        projectId: "mypwv-79723",
        storageBucket: "mypwv-79723.appspot.com",
        messagingSenderId: "5063626939",
        appId: "1:5063626939:web:826dc2f9e84f100187599e",
        measurementId: "G-MKRJZXLTBB"
    });
    console.log('point 1.1');
    const auth = fa.getAuth(app);
    console.log('point 2');
    fa.createUserWithEmailAndPassword(auth, 'gibran.shah.pwv@gmail.com', 'pwv.4real.123.@')
      .then((userCredential) => {
        console.log('point 3');
        res.status(200).send('success!');
      })
      .catch((error) => {
        console.log('point 4');
        res.status(500).send(JSON.stringify(error));
      });
      console.log('point 5');
      */
});

const initFirebase = function() {
    if (!fbAdmin.apps.length) {
        const serviceAccount = require(process.env.SERVICE_ACCOUNT_FILE_PATH);
        fbAdmin.initializeApp({
            credential: fbAdmin.credential.cert(serviceAccount),
            databaseURL: process.env.DB_URL
        });
        fs.appendFileSync('log.txt', new Date().toString() + ': in import.js : router.post : Firebase Admin initialized.\n');
    }
}

module.exports = router;

