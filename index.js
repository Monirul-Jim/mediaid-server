const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())

const jsonWebToken = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}



app.get('/', (req, res) => {
    res.send('Hello World!')
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dsd2lyy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const productCollection = client.db('MediaAid').collection('productCollection');
        const categoryCollection = client.db('MediaAid').collection('categoryCollection');
        const userOrderCollection = client.db('MediaAid').collection('userOrderCollection');
        const AllUserCollection = client.db("MediaAid").collection("all-userCollection");
        // create jwt token to secure api
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '30d' })
            res.send({ token })
        })
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await AllUserCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }
        app.post('/increase-category', async (req, res) => {
            const orderData = req.body;
            const result = await categoryCollection.insertOne(orderData);
            res.send(result);
        });
        app.get('/increase-category', async (req, res) => {
            const result = await categoryCollection.find().toArray()
            res.send(result)
        })
        app.post('/product-order', async (req, res) => {
            const orderData = req.body;
            const result = await productCollection.insertOne(orderData);
            res.send(result);
        });
        app.get('/get-product-admin', async (req, res) => {
            const result = await productCollection.find().toArray()
            res.send(result)
        })
        app.get('/get-product-admin/:id', async (req, res) => {
            const productId = req.params.id;

            try {
                const objectId = new ObjectId(productId);
                const result = await productCollection.findOne({ _id: objectId });

                if (!result) {
                    res.status(404).send('Product not found');
                } else {
                    res.send(result);
                }
            } catch (error) {
                console.error('Error:', error);
                res.status(500).send('Internal Server Error');
            }
        });
        app.get('/get-products-by-subcategory/:subcategory', async (req, res) => {
            const subcategory = req.params.subcategory;

            try {
                const products = await productCollection.find({ subcategory }).toArray();

                if (!products || products.length === 0) {
                    res.status(404).send('Products not found for the given subcategory');
                } else {
                    res.send(products);
                }
            } catch (error) {
                console.error('Error:', error);
                res.status(500).send('Internal Server Error');
            }
        });
        app.delete('/admin-delete-product/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await productCollection.deleteOne(query);
                if (result.deletedCount === 1) {
                    res.status(204).send();
                } else {
                    res.status(404).send({ error: 'User not found' });
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                res.status(500).send({ error: 'Internal Server Error' });
            }
        });
        // here  search blog route
        app.get('/product-search-by-name', async (req, res) => {
            try {
                const searchText = req.query.search;
                const filter = {
                    $or: [
                        { title: { $regex: searchText, $options: 'i' } }
                    ]
                };
                const searchResults = await productCollection.find(filter).toArray();
                res.status(200).json(searchResults);
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: "Internal Server Error" });
            }
        });
        //  here i make user order collection route
        app.post('/user-order-collection', async (req, res) => {
            const orderData = req.body;
            orderData.status = "pending";
            const result = await userOrderCollection.insertOne(orderData)
            res.send(result)
        });
        app.get('/user-order-collection', async (req, res) => {
            const result = await userOrderCollection.find().toArray()
            res.send(result)
        })
        app.put('/change-status-admin/:id', async (req, res) => {
            const { id } = req.params;
            const { status } = req.body;
            try {
                const updatedClass = await userOrderCollection.findOneAndUpdate(
                    { _id: new ObjectId(id) },
                    { $set: { status } },
                    { returnOriginal: false }
                );

                // if (!updatedClass.value) {
                //     return res.status(404).send('Class not found');
                // }

                return res.send({ updatedClass, message: 'updated successfully' });
            } catch (error) {
                console.error('Error updating order status:', error);
                res.status(500).send('Internal Server Error');
            }
        });
        app.get('/user-order-collection/:id', async (req, res) => {
            const { id } = req.params;
            try {
                const result = await userOrderCollection.findOne({ _id: new ObjectId(id) });
                if (!result) {
                    return res.status(404).send('User order not found');
                }
                res.send(result);
            } catch (error) {
                console.error('Error fetching user order:', error);
                res.status(500).send('Internal Server Error');
            }
        });
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user?.email };
            const alreadyExistUser = await AllUserCollection.findOne(query)
            if (alreadyExistUser) {
                return res.send({ message: 'user already in the database' })
            }
            const result = await AllUserCollection.insertOne(user)
            res.send(result)
        })
        app.get('/users', async (req, res) => {
            const result = await AllUserCollection.find().toArray();
            res.send(result);
        });
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };

            const result = await AllUserCollection.updateOne(filter, updateDoc);
            res.send(result);

        })
        app.get('/users/admin/:email', jsonWebToken, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                return res.send({ admin: false })
            }
            const query = { email: email }
            const user = await AllUserCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })
        app.patch('/users/seller/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'seller'
                },
            };
            const result = await AllUserCollection.updateOne(filter, updateDoc);
            res.send(result);
        })
        app.get('/users/seller/:email', jsonWebToken, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                return res.send({ admin: false })
            }
            const query = { email: email }
            const user = await AllUserCollection.findOne(query);
            const result = { admin: user?.role === 'seller' }
            res.send(result);
        })
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await AllUserCollection.deleteOne(query);
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

