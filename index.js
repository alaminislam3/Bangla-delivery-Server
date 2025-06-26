// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@jhank.0gkcofh.mongodb.net/?retryWrites=true&w=majority&appName=Jhank`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const db = client.db("parcelcollection").collection("parcels")



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    app.post('/parcels', async (req, res) => {
      const parcel = req.body;
      console.log("Received parcel:", parcel);
    
      try {
        const result = await db.insertOne(parcel);
        
        if (result.insertedId) {
          res.status(201).json({
            message: 'Parcel added successfully',
            insertedId: result.insertedId, // ✅ এটিই ক্লায়েন্টে যাবে
            parcel: parcel
          });
        } else {
          res.status(500).json({ error: 'Insert failed' });
        }
      } catch (error) {
        console.error("Error inserting parcel:", error);
        res.status(500).json({ error: 'Server error' });
      }
    });

    // GET /parcels?email=example@email.com
    app.get('/parcels', async (req, res) => {
    try {
    const email = req.query.email; // ইমেইল query string থেকে নেওয়া
    const query = email ? { email: email } : {}; // ইমেইল থাকলে ফিল্টার, না থাকলে সব

    const parcels = await db
      .find(query)
      .sort({ creation_date: -1 }) // ✅ নতুন ডেটা আগে
      .toArray();

    res.send(parcels);
  } catch (error) {
    console.error("Error getting parcels:", error);
    res.status(500).json({ message: 'Failed to get parcels' });
  }
});

const { ObjectId } = require("mongodb");

// DELETE API — Alert-free Clean Version
app.delete('/parcels/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const result = await db.deleteOne({ _id: new ObjectId(id) });

    res.send(result); 
    
  } catch (error) {
    console.error('Error deleting parcel:', error);
    res.status(500).send({ error: 'Failed to delete parcel' });
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


// Default route
app.get('/', (req, res) => {
  res.send('delevery Server is running!');
});

// Start server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
