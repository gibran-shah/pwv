const exp = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const importRoutes = require('./routes/import');
const addRoutes = require('./routes/add');
const fetchRoutes = require('./routes/fetch');

dotenv.config();

const app = exp();

const port = process.env.PORT;

const corsOptions = {
    origin: [
		'http://localhost:3000',
		'http://127.0.0.1',
		'http://127.0.0.1:5500',
		'http://www.shahspace.com',
		'https://www.shahspace.com',
		'http://shahspace.com',
		'https://shahspace.com'
	],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

fs.appendFileSync('log.txt', new Date().toString() + ': CORS set up.\n');

app.use('/import', importRoutes);
app.use('/add', addRoutes);
app.use('/fetch', fetchRoutes);

app.listen(port);

fs.appendFileSync('log.txt', new Date().toString() + ': app.js is running and listening on port ' + port + '\n');

console.log('Listening on port', port);

module.exports = app;

