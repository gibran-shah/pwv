const fa = require('firebase/auth');
const fapp = require('firebase/app');

const utils = {
    getAuth: () => {
        const app = getAppByApiKey();
        return fa.getAuth(app);
    }
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

module.exports = { utils };