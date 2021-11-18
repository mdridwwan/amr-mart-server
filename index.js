const express = require('express');
const app = express();
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config();
const { MongoClient } = require('mongodb');
const PORT = process.env.PORT || 4200;
const ObjectId = require('mongodb').ObjectId;


const serviceAccount = require('./amr-mart-firebase-adminsdk.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ufevr.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

console.log(uri)

async function verifyToken(req, res, next) {
    if (req.headers.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('amr-mart');
        const productCollection = database.collection('product');
        const productAdd = database.collection('productAlls');
        const clientReviewCollect = database.collection('clientReview');
        const userCollection = database.collection('users');

        app.get('/products', verifyToken, async (req, res) => {
            const email = req.query.email;
            const query = { email: email}
            //   console.log(query)
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.json(products);
        })
        app.get('/prodcutAll', verifyToken, async (req, res) => {
            const cursor = productAdd.find();
            const products = await cursor.toArray();
            res.json(products);
        })
        //Review Rating
        app.get('/reviews', verifyToken, async (req, res) => {
            const cursor = clientReviewCollect.find();
            const review = await cursor.toArray();
            res.json(review);
        })

        //deleting mehod
        app.delete('/products/:id', async (req, res) =>{
            const id = req.params.id;
            const query = { _id: ObjectId(id)};
            const result = await productCollection.deleteOne(query)
            res.json(result)
        })
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })

        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.json(result)
        });

        app.post('/productadd', async (req, res) => {
            const product = req.body;
            const result = await productAdd.insertOne(product);
            res.json(result)
        });
        app.post('/review', async (req, res) => {
            const review = req.body;
            const result = await clientReviewCollect.insertOne(review);
            res.json(result)
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.json(result);
            // console.log(result);
        })

        app.put('/users', async (req, res) => {
            const user = req.body;
            // console.log('put', user);
            const filter = { email: user.email };
            // data na paile add kory dive upsert: true
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        })

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await userCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    console.log('put', req.decodedEmail);
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await userCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin' })
            }

        })

    }

    finally {
        //    await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hellow amr-mart portal!')
})

app.listen(PORT, () => {
    console.log(`Listening at ${PORT}`)
})