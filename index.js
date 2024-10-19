const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// config
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleWare
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dthbdpl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
// middleware
const logger = (req, res, next) => {
  console.log("log :info", req.method, req.url);
  next();
};

// jwt verify
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorize access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(err).send({ message: "unauthorized access" });
    }
    req.user=decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const tourismCollection = client.db("carsProjects");
    const services = tourismCollection.collection("services");
    const bookings = tourismCollection.collection("bookings");

    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user logged", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });
    //  jwt token logged out
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out ", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // service related api
    // all services
    app.get("/services", async (req, res) => {
      const result = await services.find().toArray();
      res.send(result);
    });

    // single service
    app.get("/services/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const options = {
        projection: { title: 1, img: 1, price: 1 },
      };
      const result = await services.findOne(query, options);
      res.send(result);
    });

    //  bookings
    app.post("/bookings", async (req, res) => {
      const result = await bookings.insertOne(req.body);
      res.send(result);
    });

    // my bookings
    app.get("/bookings/:email", logger, verifyToken, async (req, res) => {
      console.log(req.params?.email);
      console.log(' token owner', req.user);
      
      if(req.user.email !== req.params.email){
        return res.status(403).send({message:'forbidden access'})
      }


      const email = req.params.email;
      const query = { email: email };
      const result = await bookings.find(query).toArray();
      res.send(result);
    });

    // deleted my booking service
    app.delete("/bookings/:id", async (req, res) => {
      const result = await bookings.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    // updated booking service
    app.patch("/bookings/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const updated = req.body;
      const data = {
        $set: {
          status: updated.status,
        },
      };
      const result = await bookings.updateOne(query, data);
      console.log(result);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Do not close the client connection in a server environment
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("cars project server is running");
});

app.listen(port, () => {
  console.log(`cars project server is running on port ${port}`);
});
