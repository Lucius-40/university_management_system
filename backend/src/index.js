const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');

dotenv.config({path: path.resolve(__dirname, './.env')});
// console.log(process.env.DATABASE_URL);


const authRouter = require('./routes/authRoutes.js')
const userRouter = require('./routes/userRoutes.js')
const bankAccountRouter = require('./routes/bankAccountRoutes.js')

const app = express();
app.use(express.json());
app.use(cors());

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/bank-accounts', bankAccountRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, (req, res)=>{
	console.log(`Server running on port http://localhost:3000`);
});

app.get('/', (req, res)=>{
	res.send('University backend running.');
})
//console.log('Loaded DB_HOST from .env:', process.env.DATABASE_URL);



