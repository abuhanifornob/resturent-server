const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");

require("dotenv").config();
const port = process.env.PORT || 5000;

// middlewer
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qcwubtw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const menuCollection = client.db("restaurant").collection("menu");
    const reviewCollecton = client.db("restaurant").collection("reviews");
    const orderCartsCollecton = client.db("restaurant").collection("carts");
    const userCollecton = client.db("restaurant").collection("user");

    // JWT Information
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(
        {
          data: user,
        },
        process.env.ACCESS_TOKEN,
        { expiresIn: "1h" }
      );

      res.send({ token });
    });

    const verifyToken = (req, res, next) => {
      if (!req.headers?.authorization) {
        return res.status(401).send({ message: "Unauthorized" });
      }
      const token = req.headers.authorization.split(" ")[1];
      // invalid token
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        // err
        if (err) {
          return res.status(401).send({ message: "Unauthorized" });
        }

        // decoded
        req.decoded = decoded.data.email;
        next();
      });
    };

    // Verify Admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded;
      const quary = { email: email };
      const result = await userCollecton.findOne(quary);
      const isAdmin = result?.role === "admin";
      console.log(isAdmin);
      if (!isAdmin) {
        return res.status(403).send({
          message: "Forbidden Acess",
        });
      }
      next();
    };

    app.post("/user", async (req, res) => {
      const user = req.body;
      const email = user?.email;
      const quary = { email };
      const isExist = await userCollecton.findOne(quary);
      if (isExist) {
        return res.send({
          message: "Email Id already Exist",
          insertedId: null,
        });
      }
      const result = await userCollecton.insertOne(user);
      res.send(result);
    });

    // get admin User
    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded;
      console.log("Decodd Enail is: ", decodedEmail);
      if (!decodedEmail === email) {
        return res.status(403).send({
          message: "Fobidden Access",
        });
      }
      const quary = { email: email };
      const result = await userCollecton.findOne(quary);
      let isAdmin = false;
      if (result?.role === "admin") {
        isAdmin = true;
      }

      res.send(isAdmin);
    });
    // Get all Users
    app.get("/user", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollecton.find().toArray();
      res.send(result);
    });
    //Update Users
    app.patch("/user/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      // const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await userCollecton.updateOne(filter, updateDoc);

      res.send(result);
    });
    // Delete a Users
    app.delete("/user/:id", verifyToken, verifyAdmin, async (req, res) => {
      const deleted = req.params.id;
      const quary = { _id: new ObjectId(deleted) };
      const result = await userCollecton.deleteOne(quary);
      res.send(result);
    });

    app.get("/menu", async (req, res) => {
      const menus = await menuCollection.find().toArray();
      res.send(menus);
    });

    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const bodyData = req.body;
      const result = await menuCollection.insertOne(bodyData);
      res.send(result);
    });
    app.patch("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const document = {
        $set: {
          name: req.body.name,
          recipe: req.body.recipe,
          image: req.body.image,
          category: req.body.category,
          price: req.body.price,
        },
      };
      const result = await menuCollection.updateOne(filter, document);
      res.send(result);
    });
    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.findOne(query);
      console.log(result);
      res.send(result);
    });

    app.delete("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const quary = { _id: new ObjectId(id) };

      const result = await menuCollection.deleteOne(quary);
      console.log("inside amenu delete Result", result);
      res.send(result);
    });

    app.get("/review", async (req, res) => {
      const reviews = await reviewCollecton.find().toArray();
      res.send(reviews);
    });
    app.get("/cart", async (req, res) => {
      const email = req.query.email;
      const quary = { email: email };
      const result = await orderCartsCollecton.find(quary).toArray();
      res.send(result);
    });
    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
      const queary = { _id: new ObjectId(id) };
      const result = await orderCartsCollecton.deleteOne(queary);
      res.send(result);
    });

    app.post("/cart", async (req, res) => {
      const cartItem = req.body;
      const result = await orderCartsCollecton.insertOne(cartItem);
      res.send(result);
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

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(` Resturent App is listening on port ${port}`);
});
