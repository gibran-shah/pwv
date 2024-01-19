const exp = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const importRoutes = require('./routes/import');
const addRoutes = require('./routes/add');
const fetchRoutes = require('./routes/fetch');
const authRoutes = require('./routes/auth');
const deleteRoutes = require('./routes/delete');
const updateRoutes = require('./routes/update');

dotenv.config();

const app = exp();

const port = process.env.PORT;

const corsOptions = {
    origin: [
		'http://www.planetshah.com',
		'https://www.planetshah.com',
		'http://planetshah.com',
		'https://planetshah.com',
		'http://127.0.0.1:5500',
		'http://localhost:5500'
	],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

fs.appendFileSync('log.txt', new Date().toString() + ': CORS set up.\n');

app.use(exp.urlencoded({extended: false}));
app.use('/import', importRoutes);
app.use('/add', addRoutes);
app.use('/fetch', fetchRoutes);
app.use('/auth', authRoutes);
app.use('/delete', deleteRoutes);
app.use('/update', updateRoutes);

app.listen(port);

fs.appendFileSync('log.txt', new Date().toString() + ': app.js is running and listening on port ' + port + '\n');

console.log('Listening on port', port);

module.exports = app;

