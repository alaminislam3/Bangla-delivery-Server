// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

const port = process.env.PORT || 5000;

const stripe = require("stripe")(`${process.env.PAYMENT_GATEWAY_KEY}`);

// Middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@jhank.0gkcofh.mongodb.net/?retryWrites=true&w=majority&appName=Jhank`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const { ObjectId } = require("mongodb");

const db = client.db("parcelcollection");
const parcelCollection = db.collection("parcel");
const paymentCollection = db.collection("payments");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    app.post("/parcels", async (req, res) => {
      const parcel = req.body;
      console.log("Received parcel:", parcel);

      try {
        const result = await parcelCollection.insertOne(parcel);

        if (result.insertedId) {
          return res.status(201).json({
            message: "Parcel added successfully",
            insertedId: result.insertedId,
            parcel: parcel,
          });
        } else {
          return res.status(500).json({ error: "Insert failed" });
        }
      } catch (error) {
        console.error("Error inserting parcel:", error);
        return res.status(500).json({ error: "Server error" });
      }
    });

    // const { ObjectId } = require('mongodb');

    // app.get('/parcels/:id', async(req,res)=> {
    //   const id = req.params.id
    //   const query = {_id: new ObjectId(id)}
    //   const result = await db.findOne(query)
    //   res.send(result)
    // })

    app.get("/parcels/:id", async (req, res) => {
      try {
        const id = req.params.id;

        // Ensure the ID is a valid MongoDB ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid Parcel ID" });
        }

        const parcel = await parcelCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!parcel) {
          return res.status(404).json({ message: "Parcel not found" });
        }

        res.send(parcel);
      } catch (error) {
        console.error("Error getting parcel by ID:", error);
        res.status(500).json({ message: "Failed to get parcel" });
      }
    });

    // GET /parcels?email=example@email.com
    app.get("/parcels", async (req, res) => {
      try {
        const email = req.params.email;
        const query = email ? { email: email } : {};
        const parcels = await parcelCollection
          .find(query)
          .sort({ creation_date: -1 }) /* get latest product  */
          .toArray();
        res.send(parcels);
      } catch (error) {
        console.log(error);
      }
    });

    // app.get("/parcels", async (req, res) => {
    //   try {
    //     const email = req.query.email; // ইমেইল query string থেকে নেওয়া
    //     const query = email ? { email: email } : {}; // ইমেইল থাকলে ফিল্টার, না থাকলে সব

    //     const parcels = await db
    //       .find(query)
    //       .sort({ creation_date: -1 }) //
    //       .toArray();

    //     res.send(parcels);
    //   } catch (error) {
    //     console.error("Error getting parcels:", error);
    //     res.status(500).json({ message: "Failed to get parcels" });
    //   }
    // });

    // const { ObjectId } = require("mongodb");

    // DELETE API — Alert-free Clean Version
    app.delete("/parcels/:id", async (req, res) => {
      const id = req.params.id;

      try {
        const result = await parcelCollection.deleteOne({ _id: new ObjectId(id) });

        res.send(result);
      } catch (error) {
        console.error("Error deleting parcel:", error);
        res.status(500).send({ error: "Failed to delete parcel" });
      }
    });

    app.post("/create-payment-intent", async (req, res) => {
      const amountInCents = req.body.amountInCents;
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          // amount: 1000, // amount in cents
          amount: amountInCents,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    /* after walet payment  */
    app.post("/payments", async (req, res) => {
      try {
        const { parcelId, email, amount, transactionId, paymentMethod } =
          req.body;

        const paymentDoc = {
          parcelId,
          email,
          amount,
          transactionId,
          paymentMethod,
          paid_at_string: new Date(),
          paid_at: new Date(),
        };
        const paymentResult = await paymentCollection.insertOne(paymentDoc);
       
     const res2=   await parcelCollection.updateOne(
          { _id: new ObjectId(parcelId) },
          { $set: { paymentStatus: "paid" } }
        );
console.log(res2);
        res.send({
          success: true,
          message: "Payment saved and parcel marked as paid",
          insertedId: paymentResult.insertedId
,
        });
      } catch (error) {
        console.error("Payment insert error:", error);
        res.status(500).send({ success: false, error: error.message });
      }
    });
    app.get("/payments", async (req, res) => {
      try {
        const email = req.query.email;
        const query = email ? { email } : {};

        const payments = await db
          .collection("payments")
          .find(query)
          .sort({ date: -1 }) // DESCENDING: latest first
          .toArray();

        res.send(payments);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Default route
app.get("/", (req, res) => {
  res.send("delivery Server is running!");
});

// Start server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
