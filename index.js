const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;

const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())




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
                // Convert the productId string to ObjectId
                const objectId = new ObjectId(productId);

                // Use the objectId in the query to find the product
                const result = await productCollection.findOne({ _id: objectId });

                if (!result) {
                    // If no product is found, return a 404 status
                    res.status(404).send('Product not found');
                } else {
                    // If the product is found, send it in the response
                    res.send(result);
                }
            } catch (error) {
                // Handle errors, e.g., invalid ObjectId format
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