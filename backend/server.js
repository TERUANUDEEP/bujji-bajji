const express = require("express");

const ADMINS = [
  "teruanudeep987@gmail.com",
  "sanju01800@gmail.com"
];

const brevo = require("@getbrevo/brevo");
console.log("transactionalEmails:");
console.log(brevo.Brevo.transactionalEmails);




const puppeteer = require("puppeteer");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const dotenv = require("dotenv");
const Razorpay = require("razorpay");

dotenv.config();
const razorpay = new Razorpay({

  key_id:
    process.env.RAZORPAY_KEY_ID,

  key_secret:
    process.env.RAZORPAY_KEY_SECRET

});

const app = express();
const PORT = process.env.PORT || 3000;



app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({
  extended: true,
  limit: "50mb"
}));
app.use(cors());



/* =========================
   📦 SCHEMA
========================= */

const UserSchema = new mongoose.Schema({

  addresses: [

  {

    label: String,

    fullName: String,

    phone: String,
    

    house: String,

    street: String,

    city: String,

    pincode: String,

    latitude: Number,

    longitude: Number,

    isDefault: Boolean

  }

],

 availability: {

    type: String,

    default: "Available"

  },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: "Guest" },
  phone: {
  type: String,
  default: ""
},
  avatar: { type: String, default: "" },
  role: { type: String, default: "user" },
  favorites: { type: [String], default: [] }
  
});


const OrderSchema = new mongoose.Schema({
  items: Array,
  total: Number,
  time: String,

  status: {
    type: String,
    default: "Preparing 🍳"
  },

  user: String,
  payment: String,
  phone: String,
  address: String,

  deliveryOtp: {
    type: String,
    default: ""
  },

  otpVerified: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  assignedAgent: {
  type: String,
  default: ""
},

assignedAgentName: {
  type: String,
  default: ""
}

});

const RatingSchema = new mongoose.Schema({
  user: String,
  score: Number
}, { _id: false });

const ItemSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  description: { type: String, default: "" },
  categories: { type: [String], default: [] },
  image: { type: String, default: "" },
  avgRating: { type: Number, default: 4.5 },
  ratings: { type: [RatingSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  addedBy: { type: String, default: "system" },
  isNewUser: { type: Boolean, default: false }
});

const FeedbackSchema = new mongoose.Schema({
  user: String,
  name: String,
  email: String,
  itemName: { type: String, default: "" },
  image: { type: String, default: "" },
  text: String,
  rating: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  likedBy: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});


const User = mongoose.model("User", UserSchema);
const Order = mongoose.model("Order", OrderSchema);
const Item = mongoose.model("Item", ItemSchema);
const Feedback = mongoose.model("Feedback", FeedbackSchema);
console.log("BREVO_USER =", process.env.BREVO_USER);
console.log("BREVO_PASS exists =", !!process.env.BREVO_PASS);


let otpStore = {};

/* =========================
   🚀 ROUTES
========================= */



const WEBSITE_URL =
  process.env.WEBSITE_URL ||
  "http://localhost:5500";

async function autoAssignOrders() {

  const availableAgents =

    await User.find({

      role: "agent",

      availability: "Available"

    });

  if (!availableAgents.length) {

    return;

  }

  const activeOrders =

    await Order.find({

      status: {

        $not: /Delivered/

      }

    });

  const unassignedOrders =

    activeOrders.filter(

      order =>

      !order.assignedAgent

    );

  const workload = {};

  availableAgents.forEach(agent => {

    workload[agent.email] =

      activeOrders.filter(

        order =>

          order.assignedAgent ===

          agent.email

      ).length;

  });

  for (

    const order

    of unassignedOrders

  ) {

    let selectedAgent = null;

    const belowTarget =

      availableAgents.filter(

        agent =>

          workload[
            agent.email
          ] < 3

      );

    if (

      belowTarget.length

    ) {

      selectedAgent =

        belowTarget.sort(

          (a, b) =>

            workload[a.email]

            -

            workload[b.email]

        )[0];

    }

    else {

      selectedAgent =

        availableAgents.sort(

          (a, b) =>

            workload[a.email]

            -

            workload[b.email]

        )[0];

    }

    order.assignedAgent =

      selectedAgent.email;

    await order.save();

    workload[
      selectedAgent.email
    ]++;

  }

}
// 👤 REGISTER
app.post("/register", async (req, res) => {
  try {
    let { email, password, name } = req.body;
    let existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });
    let hashedPassword = await bcrypt.hash(password, 10);
   let role = "user";

if (email === "teruanudeep987@gmail.com") {
  role = "superadmin";
}

if (email === "sanju01800@gmail.com") {
  role = "admin";
}
    let user = new User({ email, password: hashedPassword, name: name || "Guest", role });
    await user.save();
    res.json({ message: "Registered successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/reset-ratings", async (req,res)=>{

  await Item.updateMany(
    {},
    {
      $set:{
        ratings:[],
        avgRating:4.5
      }
    }
  );

  res.json({
    message:"All ratings reset"
  });

});


app.delete("/delete-item/:id", async (req,res)=>{

  try {

    let { email } = req.body;

    let user =
      await User.findOne({
        email
      });

    if (
      !user ||
      user.role !== "superadmin"
    ) {

      return res.status(403).json({
        message:
          "Only superadmin can delete items"
      });

    }

    await Item.findByIdAndDelete(
      req.params.id
    );

    res.json({
      message:"Item deleted"
    });

  } catch(err) {

    console.log(err);

    res.status(500).json({
      message:"Delete failed"
    });

  }

});

app.put("/edit-item/:id", async (req,res)=>{

  try {

    let {
      email,
      name,
      price,
      description
    } = req.body;

    let user =
      await User.findOne({
        email
      });

    if (
      !user ||
      !["admin","superadmin"]
      .includes(user.role)
    ) {

      return res.status(403).json({
        message:"Not allowed"
      });

    }

    let updated =
      await Item.findByIdAndUpdate(
        req.params.id,
        {
          name,
          price,
          description
        },
        { returnDocument: "after" }
      );

    res.json({
      message:"Item updated",
      item:updated
    });

  } catch(err){

    console.log(err);

    res.status(500).json({
      message:"Update failed"
    });

  }

});



// 🔑 LOGIN
app.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });
    let validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: "Wrong password" });
    let token = jwt.sign({ email: user.email }, process.env.JWT_SECRET || "secretkey", { expiresIn: "7d" }  );
    res.json({
      message: "Login successful",
      token,
      email: user.email,
      name: user.name || user.email.split("@")[0],
      avatar: user.avatar || "",
      role: user.role || "user"
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/agent-register", async (req, res) => {

  try {

    const {
      name,
      email,
      password,
      phone
    } = req.body;

    const existingUser =
      await User.findOne({ email });

    if (existingUser) {
      return res
        .status(400)
        .json({
          error: "Agent already exists"
        });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const agent =
  new User({

    name,
    email,
    phone,

    password:
      hashedPassword,

    role: "agent",

    availability:
      "Available"

  });

    await agent.save();

    res.json({
      success: true,
      message:
        "Agent created successfully"
    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      error: err.message
    });

  }

});

app.post("/agent-availability", async (req, res) => {

  try {

    const {
      email,
      availability
    } = req.body;

    const agent =
      await User.findOneAndUpdate(

        { email },

        {
          availability
        },

        {
          returnDocument: "after"
        }

      );

    if (!agent) {

  return res.status(404).json({

    success: false,

    message:
    "Agent not found"

  });

}
console.log(
  "STATUS:",
  availability
);
if (
  availability &&
  availability.toLowerCase() ===
  "offline"
){

  await Order.updateMany(

    {
      assignedAgent: email,

      status: {
        $not: /Delivered/
      }

    },

    {
      assignedAgent: ""
    }

  );

  await autoAssignOrders();

}

res.json({

  success: true,

  availability:
    agent.availability

});
  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      success: false

    });

  }

});
app.get("/agents", async (req, res) => {

  try {

    const agents =
      await User.find({
        role: "agent"
      })
      .select("-password");

    res.json(agents);

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      error: err.message
    });

  }

});
app.post("/agent-login", async (req, res) => {

  try {

    const {
      email,
      password
    } = req.body;

    const user =
      await User.findOne({
        email
      });

    if (!user) {

      return res.status(400).json({
        message: "Agent not found"
      });

    }

    if (user.role !== "agent") {

      return res.status(403).json({
        message: "Not an agent account"
      });

    }

    const validPassword =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!validPassword) {

      return res.status(400).json({
        message: "Invalid password"
      });

    }

    res.json({

      success: true,

      agent: {

        name: user.name,
        email: user.email,
        phone: user.phone

      }

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: err.message
    });

  }

});

app.get("/user/:email", async (req, res) => {
  try {
    let user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ email: user.email, name: user.name, avatar: user.avatar, role: user.role, favorites: user.favorites });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/assign-order", async (req, res) => {

  try {

    const {
      orderId,
      agentEmail
    } = req.body;

    const agent = await User.findOne({

      email: agentEmail,

      role: "agent",

      availability: "Available"

    });

    if (!agent) {

      return res.status(400).json({

        success: false,

        message:
        "Agent unavailable or deleted"

      });

    }

    const order =
      await Order.findByIdAndUpdate(

        orderId,

        {
          assignedAgent:
            agentEmail
        },

        {
           returnDocument: 'after'
        }

      );

    res.json({

      success: true,

      order

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      success: false

    });

  }

});
app.post("/reassign-order", async (req, res) => {

  try {

    const { orderId } = req.body;

    const order =
      await Order.findByIdAndUpdate(

        orderId,

        {
          assignedAgent: ""
        },

        {
          returnDocument: "after"
        }

      );

    if (!order) {

      return res.status(404).json({
        success: false,
        message: "Order not found"
      });

    }

    res.json({

      success: true,

      message:
      "Order unassigned successfully"

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      success: false

    });

  }

});
app.delete("/delete-agent/:id", async (req, res) => {

  try {

    const { id } = req.params;

    const agent =
      await User.findById(id);

    if (!agent) {

      return res.status(404).json({

        success: false,

        message: "Agent not found"

      });

    }

    await User.findByIdAndDelete(id);

    await Order.updateMany(

      {

        assignedAgent:
          agent.email,

        status: {

          $not: /Delivered/

        }

      },

      {

        assignedAgent: ""

      }

    );

    await autoAssignOrders();

    res.json({

      success: true,

      message:
        "Agent deleted successfully"

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      success: false

    });

  }

});
app.get("/agent-orders/:email", async (req, res) => {

  try {

    const orders = await Order.find({
      assignedAgent: req.params.email
    });

    res.json(orders);

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      error: err.message
    });

  }

});

app.put("/mark-delivered", async (req, res) => {

  try {

    const { orderId } = req.body;

    const order =
      await Order.findById(orderId);

    if (!order) {

      return res.status(404).json({
        success: false,
        message: "Order not found"
      });

    }

    if (!order.otpVerified) {

      return res.status(400).json({
        success: false,
        message: "OTP not verified"
      });

    }

    order.status = "Delivered ✅";

    await order.save();

    res.json({
      success: true,
      message: "Order marked as delivered"
    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

});

app.post("/save-address", async (req,res)=>{

  try{

    let {

      email,

      address

    } = req.body;

    let user =
      await User.findOne({
        email
      });

    if(!user){

      return res.status(404).json({
        message:"User not found"
      });

    }

    user.addresses =
      user.addresses || [];

    let existingAddress =
  user.addresses.find(
    a => a.label === address.label
  );

if(existingAddress){

  existingAddress.fullName =
    address.fullName;

  existingAddress.phone =
    address.phone;

  existingAddress.house =
    address.house;

  existingAddress.street =
    address.street;

  existingAddress.city =
    address.city;

  existingAddress.pincode =
    address.pincode;

  existingAddress.latitude =
    address.latitude;

  existingAddress.longitude =
    address.longitude;

}else{

  user.addresses.push(address);

}
    await user.save();

    res.json({
      message:"Address saved"
    });

  }

  catch(err){

    console.log(err);

    res.status(500).json({
      message:"Server error"
    });

  }

});


app.get("/addresses/:email", async (req,res)=>{

  try{

    let user =
      await User.findOne({
        email:req.params.email
      });

    if(!user){

      return res.json([]);
    }

    res.json(
      user.addresses || []
    );

  }

  catch(err){

    console.log(err);

    res.status(500).json({
      message:"Server Error"
    });

  }

});
app.post("/add-address", async (req,res)=>{

  try{

    let {
      email,
      address
    } = req.body;

    let user =
      await User.findOne({
        email
      });

    if(!user){

      return res.status(404).json({
        message:"User not found"
      });

    }

    if(!user.addresses){

      user.addresses = [];

    }

    user.addresses.push(address);

    await user.save();

    res.json({
      message:"Address added"
    });

  }

  catch(err){

    console.log(err);

    res.status(500).json({
      message:"Server Error"
    });

  }

});

app.put(
"/set-default-address",
async (req,res)=>{

try{

let {
email,
label
}
=
req.body;

let user =
await User.findOne({
email
});

if(!user){

return res.status(404)
.json({
message:
"User not found"
});

}

user.addresses
.forEach(a=>{

a.isDefault =
a.label === label;

});

await user.save();

res.json({
message:
"Default updated"
});

}

catch(err){

console.log(err);

res.status(500)
.json({
message:
"Server Error"
});

}

});

app.delete(
"/delete-address",
async (req,res)=>{

try{

let {
email,
label
}
=
req.body;

let user =
await User.findOne({
email
});

if(!user){

return res.status(404)
.json({
message:
"User not found"
});

}

user.addresses =
user.addresses.filter(
a =>
a.label !== label
);

await user.save();

res.json({
message:
"Address deleted"
});

}

catch(err){

console.log(err);

res.status(500)
.json({
message:
"Server Error"
});

}

});


app.put("/user/profile", async (req, res) => {
  try {
    let { email, newEmail, name, avatar } = req.body;
    let user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (newEmail) {
      let exists = await User.findOne({ email: newEmail });
      if (exists) return res.status(400).json({ message: "Email already exists" });
      user.email = newEmail;
    }
    if (name) user.name = name;
    if (avatar) user.avatar = avatar;
    await user.save();
    res.json({ message: "Profile updated", email: user.email, name: user.name, avatar: user.avatar });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }

});

app.get("/default-address/:email", async (req,res)=>{

  try{

    let user =
      await User.findOne({
        email:req.params.email
      });

    if(
      !user ||
      !user.addresses
    ){

      return res.json(null);

    }

    let address =
      user.addresses.find(
        a => a.isDefault
      );

    res.json(address || null);

  }

  catch(err){

    console.log(err);

    res.status(500).json({
      message:"Server Error"
    });

  }

});

app.get("/dashboard-stats", async (req, res) => {

  try {

    let totalUsers =
      await User.countDocuments();

    let totalAdmins =
      await User.countDocuments({
        role: "admin"
      });

    let totalSuperadmins =
      await User.countDocuments({
        role: "superadmin"
      });

    let totalItems =
      await Item.countDocuments();

    let totalOrders =
      await Order.countDocuments();
      let orders =
  await Order.find();

let totalRevenue =
  orders.reduce(
    (sum, order) =>
      sum + (order.total || 0),
    0
  );

    let totalFeedbacks =
      await Feedback.countDocuments();

    let feedbacks =
      await Feedback.find();

    let averageRating = 0;

    if (feedbacks.length > 0) {

      let sum =
        feedbacks.reduce(
          (total, fb) =>
            total + (fb.rating || 0),
          0
        );

      averageRating =
        (
          sum /
          feedbacks.length
        ).toFixed(1);

    }

    let totalLikes =
      feedbacks.reduce(
        (total, fb) =>
          total + (fb.likes || 0),
        0
      );

    res.json({

      users:
        totalUsers,

      admins:
        totalAdmins,

      superadmins:
        totalSuperadmins,

      items:
        totalItems,

      orders:
        totalOrders,

        revenue:
  totalRevenue,

      feedbacks:
        totalFeedbacks,

      averageRating,

      likes:
        totalLikes

    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Server Error"
    });

  }

});

app.put(
"/edit-address",
async (req,res)=>{

try{

let {
email,
label,
fullName,
phone,
house,
street,
city,
pincode
}
=
req.body;

let user =
await User.findOne({
email
});

if(!user){

return res.status(404)
.json({
message:
"User not found"
});

}

let address =
user.addresses.find(
a => a.label === label
);

if(!address){

return res.status(404)
.json({
message:
"Address not found"
});

}

address.fullName =
fullName;

address.phone =
phone;

address.house =
house;

address.street =
street;

address.city =
city;

address.pincode =
pincode;

await user.save();

res.json({
message:
"Address updated"
});

}

catch(err){

console.log(err);

res.status(500)
.json({
message:
"Server Error"
});

}

});


// ❤️ ADD FAVORITE
app.post("/favorite", async (req, res) => {

  try {

    let { email, item } = req.body;

    let user = await User.findOne({ email });

    if (!user) {

      return res.status(404).json({
        message: "User not found"
      });

    }

    // 🚫 Avoid duplicates
    if (!user.favorites.includes(item)) {

      user.favorites.push(item);

      await user.save();

    }

    res.json({
      message: "Favorite added"
    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Server error"
    });

  }

});

// 📜 GET FAVORITES
app.get("/favorites/:email", async (req, res) => {

  try {

    let user =
      await User.findOne({

        email: req.params.email

      });

    if (!user) {

      return res.status(404).json({
        message: "User not found"
      });

    }

    res.json(user.favorites);

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Server error"
    });

  }

});

app.get("/items", async (req, res) => {
  try {
    const items = await Item.find().sort({ isNewUser: -1, createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/seed-items", async (req, res) => {
  try {
    const existingCount = await Item.countDocuments();
    if (existingCount > 0) {
      return res.json({ message: "Items already seeded" });
    }

    const items = [
      { _id: "1", name: "Paneer Bajji", description: "Creamy paneer wrapped in crispy golden batter.", categories: ["Popular", "Crispy"], price: 55, avgRating: 4.8, ratings: [], image: "paneer.jpg" },
      { _id: "2", name: "Mirchi Bajji", description: "Hot green chillies stuffed and fried Andhra style.", categories: ["Spicy", "Popular"], price: 40, avgRating: 4.7, ratings: [], image: "mirchi.jpg" },
      { _id: "3", name: "Onion Pakoda", description: "Crunchy onion pakodas with spicy masala.", categories: ["Crispy", "Popular"], price: 35, avgRating: 4.6, ratings: [], image: "onionpakoda.jpg" },
      { _id: "4", name: "Punugulu", description: "Soft inside, crispy outside Andhra punugulu.", categories: ["New", "Popular"], price: 45, avgRating: 4.9, ratings: [], image: "punugulu.jpg" },
      { _id: "5", name: "Chicken Biryani", description: "Hyderabadi dum biryani with rich spices.", categories: ["Popular", "Spicy"], price: 199, avgRating: 4.9, ratings: [], image: "chickenbiriyani.jpg" },
      { _id: "6", name: "Veg Pizza", description: "Cheesy overloaded veggie pizza.", categories: ["New", "Crispy"], price: 149, avgRating: 4.5, ratings: [], image: "vegpizza.jpg" },
      { _id: "7", name: "Pani Puri", description: "Crispy pani puri with spicy mint water.", categories: ["Spicy", "Popular"], price: 60, avgRating: 4.6, ratings: [], image: "panipuri.jpg" },
      { 
  _id: "8",
  name: "Chocolate Cake",
  description: "Rich creamy chocolate delight.",
  categories: ["Sweet", "Popular"],
  price: 120,
  avgRating: 4.9,
  ratings: [],
  image: "chocolatecake.jpg"
},

{
  _id: "9",
  name: "Vanilla Ice Cream",
  description: "Cold creamy vanilla happiness.",
  categories: ["Sweet", "New"],
  price: 80,
  avgRating: 4.7,
  ratings: [],
  image: "vanila.jpg"
},

{
  _id: "10",
  name: "Masala Bajji",
  description: "Spicy masala stuffed crispy bajji.",
  categories: ["Spicy", "Crispy"],
  price: 50,
  avgRating: 4.8,
  ratings: [],
  image: "masalabajji.jpg"
},

{
  _id: "11",
  name: "Gobi Pakoda",
  description: "Golden cauliflower fritters with chutney.",
  categories: ["Crispy", "Popular"],
  price: 45,
  avgRating: 4.6,
  ratings: [],
  image: "gobipakoda.jpg"
},
      { _id: "12", name: "Mixed Pakoda", description: "Crunchy medley of vegetables in batter.", categories: ["Crispy", "New"], price: 50, avgRating: 4.7, ratings: [], image: "mixedpakoda.jpg" },
      { _id: "13", name: "Biryani Rice", description: "Fragrant biryani rice with spices.", categories: ["Popular", "Spicy"], price: 180, avgRating: 4.8, ratings: [], image: "biriyanirice.jpg" },
      { _id: "14", name: "Cheese Pizza", description: "Double cheese pizza with crispy crust.", categories: ["Crispy", "New"], price: 159, avgRating: 4.7, ratings: [],image: "cheesepizza.jpg" },
      { _id: "15", name: "Pani Puri Spicy", description: "Extra spicy pani puri variant.", categories: ["Spicy", "New"], price: 70, avgRating: 4.6, ratings: [] ,image:  "panipurispicy.jpg"},
      { _id: "16", name: "Mango Ice Cream", description: "Creamy mango flavored ice cream.", categories: ["Sweet", "New"], price: 90, avgRating: 4.8, ratings: [] ,image: "mangoicecream.jpg"},
      { _id: "17", name: "Butterscotch Cake", description: "Sweet butterscotch layered cake.", categories: ["Sweet", "Popular"], price: 130, avgRating: 4.7, ratings: [] ,image: "butterscotchcake.jpg"},
      { _id: "18", name: "Strawberry Cake", description: "Fresh strawberry delight cake.", categories: ["Sweet", "New"], price: 140, avgRating: 4.8, ratings: [] ,image: "strawberrycake.jpg"},
      { _id: "19", name: "Chocolate Chips Ice Cream", description: "Ice cream with crunchy chocolate chips.", categories: ["Sweet"], price: 100, avgRating: 4.9, ratings: [] ,image: "chocolatechipsicecream.jpg"},
      { _id: "20", name: "Tandoori Paneer Pakoda", description: "Tandoori flavored paneer pakoda.", categories: ["Spicy", "Crispy"], price: 65, avgRating: 4.7, ratings: [] ,image: "tandooripaneerpakoda.jpg"},
      { _id: "21", name: "Samosa", description: "Crispy potato and peas samosa.", categories: ["Popular", "Spicy"], price: 30, avgRating: 4.6, ratings: [] ,image: "samosa.jpg"},
      { _id: "22", name: "Pepperoni Pizza", description: "Pizza loaded with spicy pepperoni.", categories: ["Spicy", "New"], price: 169, avgRating: 4.8, ratings: [] ,image: "pepperonipizza.jpg"},
      { _id: "23", name: "Jalebi", description: "Sweet spirals soaked in syrup.", categories: ["Sweet", "Popular"], price: 40, avgRating: 4.7, ratings: [] ,image: "jalebi.jpg"},
      { _id: "24", name: "Gulab Jamun", description: "Soft milk solids in sweet syrup.", categories: ["Sweet", "New"], price: 50, avgRating: 4.8, ratings: [] ,image: "gulabjamun.jpg"}
    ];

    await Item.insertMany(items);
    res.json({ message: "Items seeded successfully", count: items.length });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/items", async (req, res) => {
  try {
    let { email, name, price, description, categories, image } = req.body;
    let user = await User.findOne({ email });

if (!user || !["admin", "superadmin"].includes(user.role)) {
  return res.status(403).json({
    message: "Not allowed"
  });
}    let today = new Date();
    today.setHours(0, 0, 0, 0);
    let countToday = await Item.countDocuments({ addedBy: email, createdAt: { $gte: today } });
    console.log("Items today:", countToday);
    if (countToday >= 5) return res.status(403).json({ message: "🚫 Daily limit reached! You can add only 5 items per day. Please wait until tomorrow."});
    let newId = Date.now().toString();
    let item = new Item({ _id: newId, name, price, description, categories, image, avgRating: 0, addedBy: email, isNewUser: true });
    await item.save();
    res.json({ message: "Item added" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/rate", async (req, res) => {
  try {
    let { itemId, email, score } = req.body;
    let item = await Item.findOne({ _id: itemId });
    if (!item) return res.status(404).json({ message: "Item not found" });
    
    let existing =
  item.ratings.find(
    rating => rating.user === email
  );

if (existing) {

  existing.score = Number(score);

} else {

  item.ratings.push({
    user: email,
    score: Number(score)
  });

}
    let total = item.ratings.reduce((sum, r) => sum + r.score, 0);
    item.avgRating = total / item.ratings.length;
    await item.save();
    res.json({ message: "Rating recorded", avgRating: item.avgRating, ratingsCount: item.ratings.length });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/feedback", async (req, res) => {
  try {
    let { email, name, image, text, rating, itemName } = req.body;
    let feedback = new Feedback({ email, name, image, text, rating: rating || 0, itemName: itemName || "" });
    await feedback.save();

    // If itemName provided, try to update the item's rating
    if (itemName && itemName.trim()) {
      try {
        let item = await Item.findOne({ name: itemName.trim() });
        if (item && rating > 0) {
          let existing =
  item.ratings.find(
    r => r.user === email
  );

if (existing) {

  existing.score = Number(rating);

} else {

  item.ratings.push({
    user: email,
    score: Number(rating)
  });

}
          let total = item.ratings.reduce((sum, r) => sum + r.score, 0);
          item.avgRating = total / item.ratings.length;
          await item.save();
        }
      } catch (err) {
        console.log("Item rating update failed:", err.message);
      }
    }

    res.json({ message: "Feedback uploaded" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/feedbacks", async (req, res) => {
  try {
    let feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/feedbacks/user/:email", async (req, res) => {
  try {

    let feedbacks =
      await Feedback.find({
        email: req.params.email
      })
      .sort({ createdAt: -1 });

    res.json(feedbacks);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Server error"
    });

  }
});

app.post("/feedback/:id/like", async (req, res) => {

  console.log("🔥 NEW LIKE ROUTE HIT 🔥");

  try {

    let { email } = req.body;

    let feedback =
      await Feedback.findById(
        req.params.id
      );

    if (!feedback) {
      return res.status(404).json({
        message: "Feedback not found"
      });
    }

    if (
      feedback.likedBy.includes(email)
    ) {

      feedback.likedBy =
        feedback.likedBy.filter(
          e => e !== email
        );

    } else {

      feedback.likedBy.push(email);

    }

    feedback.likes =
      feedback.likedBy.length;

    await feedback.save();

    res.json({
      likes: feedback.likes,
      liked:
        feedback.likedBy.includes(
          email
        )
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Server error"
    });

  }
});

app.delete("/feedback/:id", async (req, res) => {
  try {

    let feedback =
      await Feedback.findById(
        req.params.id
      );

    if (!feedback) {
      return res.status(404).json({
        message: "Feedback not found"
      });
    }

    await Feedback.findByIdAndDelete(
      req.params.id
    );

    res.json({
      message: "Feedback deleted"
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Server error"
    });

  }
});

app.put("/feedback/:id", async (req, res) => {
  try {

    let { text, rating } = req.body;

    let feedback =
      await Feedback.findByIdAndUpdate(
        req.params.id,
        {
          text,
          rating
        },
        { returnDocument: "after" }
      );

    if (!feedback) {
      return res.status(404).json({
        message: "Feedback not found"
      });
    }

    res.json({
      message: "Feedback updated ✅",
      feedback
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Server error"
    });

  }
});


// ❌ REMOVE FAVORITE
app.post("/remove-favorite", async (req, res) => {

  try {

    let { email, item } = req.body;

    let user = await User.findOne({ email });

    if (!user) {

      return res.status(404).json({
        message: "User not found"
      });

    }

    user.favorites =
      user.favorites.filter(f => f !== item);

    await user.save();

    res.json({
      message: "Favorite removed"
    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Server error"
    });

  }

});

async function sendInvoiceEmail(order) {

  try {

    const verifyQR = await QRCode.toDataURL(
      JSON.stringify({
        orderId: order._id,
        customer: order.user,
        phone: order.phone,
        total: order.total,
        status: order.status
      })
    );

    const trackingQR =
      await QRCode.toDataURL(
        `${WEBSITE_URL}/tracking.html?id=${order._id}`
      );

    const invoiceId =
      `INV-${order._id.toString().slice(-6).toUpperCase()}`;

    const invoiceHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
    </head>

    <body style="
      font-family:Arial,sans-serif;
      background:#f4f4f4;
      padding:20px;
    ">

      <div style="
        max-width:800px;
        margin:auto;
        background:white;
        border-radius:20px;
        overflow:hidden;
        border:1px solid #ddd;
      ">

        <div style="
          background:linear-gradient(135deg,#b91c1c,#ef4444);
          color:white;
          padding:25px;
        ">

          <h1 style="margin:0;">
            🍽️ BUJJI BAJJI
          </h1>

          <p>
            Crispy Outside. Happy Inside.
          </p>

          <h2>
            Invoice: ${invoiceId}
          </h2>

        </div>

        <div style="padding:25px;">

          <h2>Customer Details</h2>

          <p><b>Email:</b> ${order.user}</p>
          <p><b>Phone:</b> ${order.phone}</p>
          <p><b>Address:</b> ${order.address}</p>
          <p><b>Payment:</b> ${order.payment}</p>
          <p><b>Status:</b> ${order.status}</p>
          <p><b>Order Time:</b> ${order.time}</p>

          <hr>

          <h2>Items Ordered</h2>

          <table
            width="100%"
            border="1"
            cellspacing="0"
            cellpadding="10"
            style="border-collapse:collapse;"
          >

            <tr style="
              background:#b91c1c;
              color:white;
            ">
              <th>Item</th>
              <th>Price</th>
              <th>Qty</th>
              <th>Total</th>
            </tr>

            ${order.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>₹${item.price}</td>
                <td>${item.qty}</td>
                <td>₹${item.price * item.qty}</td>
              </tr>
            `).join("")}

          </table>

          <h1 style="
            text-align:right;
            color:#b91c1c;
          ">
            Grand Total: ₹${order.total}
          </h1>

          <div style="
            display:flex;
            justify-content:space-around;
            margin-top:30px;
          ">

            <div style="text-align:center;">
              <img src="${trackingQR}" width="140">
              <p>Track Order</p>
            </div>

            <div style="text-align:center;">
              <img src="${verifyQR}" width="140">
              <p>Verify Order</p>
            </div>

          </div>

        </div>

        <div style="
          background:#b91c1c;
          color:white;
          text-align:center;
          padding:20px;
        ">
          ❤️ Thank you for choosing BUJJI BAJJI
        </div>

      </div>

    </body>
    </html>
    `;

    const response = await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",

        headers: {
          "accept": "application/json",
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json"
        },

        body: JSON.stringify({

          sender: {
            name: "BUJJI BAJJI",
            email: "teruanudeep987@gmail.com"
          },

          to: [
            {
              email: order.user
            }
          ],

          subject:
            `BUJJI BAJJI Invoice ${invoiceId}`,

          htmlContent:
            invoiceHtml

        })

      }
    );

    const data =
      await response.json();

    console.log(
      "INVOICE EMAIL:",
      data
    );

  }

  catch (err) {

    console.log(
      "Invoice Email Error:",
      err
    );

  }

}

app.post("/order", async (req, res) => {

  try {

    const {
      items,
      total,
      user,
      payment,
      time,
      phone,
      address
    } = req.body;

    let finalPhone = phone || "";
    let finalAddress = address || "";

    const customer =
      await User.findOne({ email: user });

    if (customer) {

      if (!finalPhone) {
        finalPhone = customer.phone || "";
      }

      if (!finalAddress && customer.addresses?.length) {

        const defaultAddress =
          customer.addresses.find(
            a => a.isDefault
          );

        const selectedAddress =
          defaultAddress ||
          customer.addresses[0];

        if (selectedAddress) {

          finalAddress =
            `${selectedAddress.house}, ${selectedAddress.street}, ${selectedAddress.city} - ${selectedAddress.pincode}`;

          if (!finalPhone) {
            finalPhone =
              selectedAddress.phone || "";
          }

        }

      }

    }

    const newOrder = new Order({

      items,
      total,
      user,
      payment,
      time,

      phone: finalPhone,
      address: finalAddress,

      status: "Preparing 🍳"

    });

    await newOrder.save();

await autoAssignOrders();

    try {

      await sendInvoiceEmail(
        newOrder
      );

      console.log(
        "✅ Invoice email sent"
      );

    } catch (err) {

      console.log(
        "❌ Invoice email failed",
        err
      );

    }

    res.json({

      success: true,
      message: "Order saved",

      order: newOrder

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      success: false,
      message: "Order save failed"

    });

  }

});
app.get("/orders", async (req, res) => {
  try {
    const data = await Order.find();
    res.json(data);
  } catch (err) {
    console.log("❌ Fetch Error:", err);
    res.status(500).json({ error: "Error fetching orders" });
  }
});

app.get("/order/:id", async (req, res) => {
  try {

    const order =
    await Order.findById(
      req.params.id
    );

    if (!order) {
      return res
      .status(404)
      .json({
        error: "Order not found"
      });
    }

    res.json(order);

  } catch (err) {

    console.log(
      "❌ Order Fetch Error:",
      err
    );

    res.status(500).json({
      error: "Error fetching order"
    });

  }
});

 app.get("/invoice-pdf/:id", async (req, res) => {

  try {

    const order =
      await Order.findById(
        req.params.id
      );

    if (!order) {

      return res.status(404).json({
        success: false,
        message: "Order not found"
      });

    }

    await sendInvoiceEmail(order);

    res.json({

      success: true,

      message:
      "Invoice sent to your email successfully"

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      success: false,

      message:
      "Failed to send invoice"

    });

  }

});
app.get("/analytics", async (req, res) => {

  try {

    const orders = await Order.find();

    const totalOrders = orders.length;

    const revenue = orders.reduce(
      (sum, order) =>
        sum + (order.total || 0),
      0
    );
const preparingOrders =
orders.filter(
  order =>
  order.status ===
  "Preparing 🍳"
).length;

const onTheWayOrders =
orders.filter(
  order =>
  order.status ===
  "On The Way 🚚"
).length;

    const deliveredOrders =
      orders.filter(
        order =>
          order.status === "Delivered ✅"
      ).length;

    const pendingOrders =
      totalOrders - deliveredOrders;

      const statusStats = {

  preparing: 0,

  outForDelivery: 0,

  delivered: 0,

  cancelled: 0

};

orders.forEach(order => {

  const status =
    order.status || "";

  if (
    status.includes("Preparing")
  ) {

    statusStats.preparing++;

  }

  else if (
    status.includes("Out")
  ) {

    statusStats.outForDelivery++;

  }

  else if (
    status.includes("Delivered")
  ) {

    statusStats.delivered++;

  }

  else if (
    status.includes("Cancel")
  ) {

    statusStats.cancelled++;

  }

});

    // Today's Stats

    const today =
      new Date().toLocaleDateString(
        "en-IN"
      );

    const todaysOrders =
      orders.filter(order =>

        new Date(
          order.createdAt
        ).toLocaleDateString(
          "en-IN"
        ) === today

      );

    const todayOrdersCount =
      todaysOrders.length;

    const todayRevenue =
      todaysOrders.reduce(
        (sum, order) =>
          sum + (order.total || 0),
        0
      );

    // Most Sold Items

    const itemMap = {};

    orders.forEach(order => {

      (order.items || []).forEach(item => {

        if (!itemMap[item.name]) {

          itemMap[item.name] = 0;

        }

        itemMap[item.name] +=
          item.qty || 1;

      });

    });

    const mostSoldItems =
      Object.entries(itemMap)

      .map(
        ([name, quantity]) => ({
          name,
          quantity
        })
      )

      .sort(
        (a, b) =>
          b.quantity - a.quantity
      )

      .slice(0, 10);

    // Daily Analytics

    const deliveryRate =
totalOrders > 0
? ((deliveredOrders / totalOrders) * 100).toFixed(1)
: 0;

    const dailyMap = {};

    orders.forEach(order => {

      const date =
        new Date(
          order.createdAt
        ).toLocaleDateString(
          "en-IN"
        );

      if (!dailyMap[date]) {

        dailyMap[date] = {

          orders: 0,
          revenue: 0

        };

      }

      dailyMap[date].orders++;

      dailyMap[date].revenue +=
        order.total || 0;

    });

    const daily =
      Object.keys(dailyMap)

      .sort((a, b) => {

        const d1 =
          new Date(
            a.split("/")
          .reverse()
          .join("-")
          );

        const d2 =
          new Date(
            b.split("/")
          .reverse()
          .join("-")
          );

        return d1 - d2;

      })

      .map(date => ({

        label: date,

        orders:
          dailyMap[date].orders,

        revenue:
          dailyMap[date].revenue

      }));

      const recentOrders =

orders

.sort(
(a,b)=>
new Date(b.createdAt)
-
new Date(a.createdAt)
)

.slice(0,10)

.map(order => ({

id: order._id,

user: order.user,

total: order.total,

status: order.status,

date: order.createdAt

}));
    res.json({

      totalOrders,
      revenue,
     
      deliveredOrders,
      pendingOrders,

       
      deliveryRate,

      statusStats,

      todayOrdersCount,
      todayRevenue,

      mostSoldItems,
      daily,

      recentOrders,
      preparingOrders,
onTheWayOrders

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      error: err.message

    });

  }

});

app.post("/send-analytics-report", async (req, res) => {

  try {

    const orders = await Order.find();

    const totalOrders =
      orders.length;

    const revenue =
      orders.reduce(
        (sum, order) =>
          sum + (order.total || 0),
        0
      );

    const deliveredOrders =
      orders.filter(
        order =>
          order.status === "Delivered ✅"
      ).length;

    const pendingOrders =
      totalOrders - deliveredOrders;

    const deliveryRate =
      totalOrders > 0
      ? (
          (deliveredOrders / totalOrders)
          * 100
        ).toFixed(1)
      : 0;

    const reportHtml = `
    <div style="
      font-family:Arial;
      max-width:700px;
      margin:auto;
      background:white;
      padding:30px;
      border-radius:20px;
    ">

      <div style="
        background:#ea580c;
        color:white;
        padding:20px;
        border-radius:15px;
        text-align:center;
      ">

        <h1>
          📊 BUJJI BAJJI Analytics Report
        </h1>

        <p>
          ${new Date().toLocaleString()}
        </p>

      </div>

      <div style="
        margin-top:20px;
        padding:15px;
        background:#fafafa;
        border-radius:12px;
      ">
        <h3>Total Orders</h3>
        <h1>${totalOrders}</h1>
      </div>

      <div style="
        margin-top:15px;
        padding:15px;
        background:#fafafa;
        border-radius:12px;
      ">
        <h3>Total Revenue</h3>
        <h1>₹${revenue}</h1>
      </div>

      <div style="
        margin-top:15px;
        padding:15px;
        background:#fafafa;
        border-radius:12px;
      ">
        <h3>Delivered Orders</h3>
        <h1>${deliveredOrders}</h1>
      </div>

      <div style="
        margin-top:15px;
        padding:15px;
        background:#fafafa;
        border-radius:12px;
      ">
        <h3>Pending Orders</h3>
        <h1>${pendingOrders}</h1>
      </div>

      <div style="
        margin-top:15px;
        padding:15px;
        background:#fafafa;
        border-radius:12px;
      ">
        <h3>Delivery Success Rate</h3>
        <h1>${deliveryRate}%</h1>
      </div>

    </div>
    `;

    const response = await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",

        headers: {
          "accept": "application/json",
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json"
        },

        body: JSON.stringify({

          sender: {
            name: "BUJJI BAJJI",
            email: "teruanudeep987@gmail.com"
          },

          to: [
            {
              email: "teruanudeep987@gmail.com"
            }
          ],

          subject:
            "📊 BUJJI BAJJI Analytics Report",

          htmlContent:
            reportHtml

        })

      }
    );

    const data =
      await response.json();

    console.log(
      "ANALYTICS EMAIL:",
      data
    );

    res.json({

      success: true,

      message:
        "Analytics report emailed successfully"

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      success: false
    });

  }

});
app.put("/order/:id", async (req, res) => {
  const { status, user } = req.body;

  let adminUser = await User.findOne({
  email: user
});

if (
  !adminUser ||
  !["admin", "superadmin"].includes(adminUser.role)
) {
  return res.status(403).send("Not allowed");
}

  try {
    await Order.findByIdAndUpdate(req.params.id, { status });
    res.send("Updated");
  } catch {
    res.status(500).send("Error");
  }
});

app.post("/send-delivery-otp", async (req, res) => {

  try {

    console.log("SEND OTP HIT");

    const { orderId } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    order.deliveryOtp = otp;
    order.otpVerified = false;

    await order.save();

    const response = await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sender: {
            name: "BUJJI BAJJI",
            email: "teruanudeep987@gmail.com"
          },
          to: [
            {
              email: order.user
            }
          ],
          subject: "BUJJI BAJJI Delivery OTP",
          htmlContent: `
            <h2>Your Delivery OTP</h2>
            <h1>${otp}</h1>
            <p>
              Share this OTP only after receiving your order.
            </p>
          `
        })
      }
    );

    const result = await response.text();

    console.log("BREVO RESPONSE:", result);

    res.json({
      success: true,
      message: "OTP Sent Successfully"
    });

  }

  catch (err) {

    console.log("OTP ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

});
app.post("/send-email-otp", async (req, res) => {

  try {

    const { email } = req.body;

    const key =
      email.trim().toLowerCase();

    const user =
      await User.findOne({
        email: key
      });

    if (!user) {

      return res.status(404).json({
        success: false,
        message: "Email not registered"
      });

    }

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    otpStore[key] = otp;

    const response = await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",

        headers: {
          "accept": "application/json",
          "api-key":
            process.env.BREVO_API_KEY,
          "content-type":
            "application/json"
        },

        body: JSON.stringify({

          sender: {
            name: "BUJJI BAJJI",
            email:
              "teruanudeep987@gmail.com"
          },

          to: [
            {
              email: key
            }
          ],

          subject:
            "BUJJI BAJJI Password Reset OTP",

          htmlContent: `
            <h2>Password Reset OTP</h2>

            <h1>${otp}</h1>

            <p>
              Use this OTP to reset your password.
            </p>
          `

        })

      }
    );

    const data =
      await response.json();

    console.log(
      "PASSWORD RESET OTP:",
      data
    );

    res.json({
      success: true
    });

  }

  catch (err) {

    console.log(
      "PASSWORD RESET ERROR:",
      err
    );

    res.status(500).json({
      success: false
    });

  }

});
app.post("/verify-email-otp", (req, res) => {
  const { email, otp } = req.body;
  const key = email.trim().toLowerCase();

  if (otpStore[key] == otp.trim()) {
    delete otpStore[key]; // cleanup
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});



app.post("/verify-delivery-otp", async (req, res) => {

  try {

    const {
      orderId,
      otp
    } = req.body;

    const order =
      await Order.findById(
        orderId
      );

    if (!order) {

      return res.status(404).json({
        success: false,
        message: "Order not found"
      });

    }

    if (
      order.deliveryOtp !== otp
    ) {

      return res.json({
        success: false,
        message: "Invalid OTP"
      });

    }

    order.otpVerified = true;

order.deliveryOtp = "";

await order.save();

    res.json({
      success: true,
      message:
      "OTP Verified Successfully"
    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      success: false
    });

  }

});

// 🔑 RESET PASSWORD
//// ✉️ Send notification email using Brevo
app.post("/reset-password", async (req, res) => {
try {

  const resetEmail = {

    sender: {
      name: "BUJJI BAJJI",
      email: "teruanudeep987@gmail.com"
    },

    to: [
      {
        email: req.body.email
      }
    ],

    subject:
      "Your BUJJI BAJJI password has been changed",

    htmlContent: `
      <h2>Password Changed Successfully ✅</h2>

      <p>
        Hello,
      </p>

      <p>
        Your BUJJI BAJJI password was successfully changed.
      </p>

      <p>
        If you did not request this change,
        please contact support immediately.
      </p>

      <br>

      <p>
        Thank you,
        <br>
        BUJJI BAJJI Team
      </p>
    `
  };

  const response =
    await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json"
        },
        body: JSON.stringify(resetEmail)
      }
    );

  const data = await response.json();

  console.log(
    "PASSWORD RESET EMAIL:",
    data
  );

}

catch (mailErr) {

  console.log(
    "Password reset email failed:",
    mailErr
  );

}});


app.get("/users", async (req, res) => {
  try {
    const users = await User.find(
      {},
      { password: 0 }
    );

    res.json(users);

  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Server error"
    });
  }
});
app.post("/make-superadmin", async (req, res) => {

  const { targetEmail } = req.body;

  await User.updateOne(
    { email: targetEmail },
    {
      $set: {
        role: "superadmin"
      }
    }
  );

  res.json({
    success: true,
    message: "User promoted to Superadmin 👑"
  });

});
app.post("/remove-superadmin", async (req, res) => {

  const { targetEmail, currentUser } = req.body;

  if(targetEmail === currentUser){

    return res.json({
      success:false,
      message:"Cannot remove yourself"
    });

  }

  await User.updateOne(
    { email: targetEmail },
    {
      $set: {
        role: "user"
      }
    }
  );

  res.json({
    success:true,
    message:"Superadmin removed 👤"
  });

});
app.post("/make-admin", async (req, res) => {
  try {

    let { currentUser, targetEmail } = req.body;

    let actor = await User.findOne({
      email: currentUser
    });

    if (!actor || actor.role !== "superadmin") {
      return res.status(403).json({
        message: "Superadmin only"
      });
    }

    let target = await User.findOne({
      email: targetEmail
    });

    if (!target) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    target.role = "admin";

    await target.save();

    res.json({
      message: "User promoted"
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Server error"
    });
  }
});
app.post("/change-email", async (req, res) => {

  try {

    const {
      currentEmail,
      newEmail
    } = req.body;

    const existingUser =
      await User.findOne({
        email: newEmail
      });

    if (existingUser) {

      return res.status(400).json({

        success: false,

        message:
        "Email already exists"

      });

    }

    await User.updateOne(

      {
        email: currentEmail
      },

      {
        email: newEmail
      }

    );

    await Order.updateMany(

      {
        user: currentEmail
      },

      {
        user: newEmail
      }

    );

    res.json({

      success: true

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      success: false

    });

  }

});
app.post("/remove-admin", async (req, res) => {
  try {

    let { currentUser, targetEmail } = req.body;

    let actor = await User.findOne({
      email: currentUser
    });

    if (!actor || actor.role !== "superadmin") {
      return res.status(403).json({
        message: "Superadmin only"
      });
    }

    let target = await User.findOne({
      email: targetEmail
    });

    if (!target) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (target.role === "superadmin") {
      return res.status(403).json({
        message: "Cannot modify superadmin"
      });
    }

    target.role = "user";

    await target.save();

    res.json({
      message: "Admin removed"
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Server error"
    });
  }
});

/* =========================
   🔗 CONNECT DB FIRST
========================= */

async function seedItems() {
  try {
    await Item.deleteMany({});

    const items24 = [
      { _id: "1", name: "Paneer Bajji", description: "Creamy paneer wrapped in crispy golden batter.", categories: ["Popular", "Crispy"], price: 55, avgRating: 4.8, ratings: [], image: "paneer.jpg" },
      { _id: "2", name: "Mirchi Bajji", description: "Hot green chillies stuffed and fried Andhra style.", categories: ["Spicy", "Popular"], price: 40, avgRating: 4.7, ratings: [], image: "mirchi.jpg" },
      { _id: "3", name: "Onion Pakoda", description: "Crunchy onion pakodas with spicy masala.", categories: ["Crispy", "Popular"], price: 35, avgRating: 4.6, ratings: [], image: "onionpakoda.jpg" },
      { _id: "4", name: "Punugulu", description: "Soft inside, crispy outside Andhra punugulu.", categories: ["New", "Popular"], price: 45, avgRating: 4.9, ratings: [], image: "punugulu.jpg" },
      { _id: "5", name: "Chicken Biryani", description: "Hyderabadi dum biryani with rich spices.", categories: ["Popular", "Spicy"], price: 199, avgRating: 4.9, ratings: [], image: "chickenbiriyani.jpg" },
      { _id: "6", name: "Veg Pizza", description: "Cheesy overloaded veggie pizza.", categories: ["New", "Crispy"], price: 149, avgRating: 4.5, ratings: [], image: "vegpizza.jpg" },
      { _id: "7", name: "Pani Puri", description: "Crispy pani puri with spicy mint water.", categories: ["Spicy", "Popular"], price: 60, avgRating: 4.6, ratings: [], image: "panipuri.jpg" },
      { _id: "8", name: "Chocolate Cake", description: "Rich creamy chocolate delight.", categories: ["Sweet", "Popular"], price: 120, avgRating: 4.9, ratings: [], image: "chocolatecake.jpg" },
      { _id: "9", name: "Vanilla Ice Cream", description: "Cold creamy vanilla happiness.", categories: ["Sweet", "New"], price: 80, avgRating: 4.7, ratings: [], image: "vanila.jpg" },
      { _id: "10", name: "Masala Bajji", description: "Spicy masala stuffed crispy bajji.", categories: ["Spicy", "Crispy"], price: 50, avgRating: 4.8, ratings: [], image: "masalabajji.jpg" },
      { _id: "11", name: "Gobi Pakoda", description: "Golden cauliflower fritters with chutney.", categories: ["Crispy", "Popular"], price: 45, avgRating: 4.6, ratings: [], image: "gobipakoda.jpg" },
      { _id: "12", name: "Mixed Pakoda", description: "Crunchy medley of vegetables in batter.", categories: ["Crispy", "New"], price: 50, avgRating: 4.7, ratings: [], image: "mixedpakoda.jpg" },
      { _id: "13", name: "Biryani Rice", description: "Fragrant biryani rice with spices.", categories: ["Popular", "Spicy"], price: 180, avgRating: 4.8, ratings: [], image: "biriyanirice.jpg" },
      { _id: "14", name: "Cheese Pizza", description: "Double cheese pizza with crispy crust.", categories: ["Crispy", "New"], price: 159, avgRating: 4.7, ratings: [], image: "cheesepizza.jpg" },
      { _id: "15", name: "Pani Puri Spicy", description: "Extra spicy pani puri variant.", categories: ["Spicy", "New"], price: 70, avgRating: 4.6, ratings: [], image: "panipurispicy.jpg" },
      { _id: "16", name: "Mango Ice Cream", description: "Creamy mango flavored ice cream.", categories: ["Sweet", "New"], price: 90, avgRating: 4.8, ratings: [], image: "mangoicecream.jpg" },
      { _id: "17", name: "Butterscotch Cake", description: "Sweet butterscotch layered cake.", categories: ["Sweet", "Popular"], price: 130, avgRating: 4.7, ratings: [], image: "butterscotchcake.jpg" },
      { _id: "18", name: "Strawberry Cake", description: "Fresh strawberry delight cake.", categories: ["Sweet", "New"], price: 140, avgRating: 4.8, ratings: [], image: "strawberrycake.jpg" },
      { _id: "19", name: "Chocolate Chips Ice Cream", description: "Ice cream with crunchy chocolate chips.", categories: ["Sweet"], price: 100, avgRating: 4.9, ratings: [], image: "chocolatechipsicecream.jpg" },
      { _id: "20", name: "Tandoori Paneer Pakoda", description: "Tandoori flavored paneer pakoda.", categories: ["Spicy", "Crispy"], price: 65, avgRating: 4.7, ratings: [], image: "tandooripaneerpakoda.jpg" },
      { _id: "21", name: "Samosa", description: "Crispy potato and peas samosa.", categories: ["Popular", "Spicy"], price: 30, avgRating: 4.6, ratings: [], image: "samosa.jpg" },
      { _id: "22", name: "Pepperoni Pizza", description: "Pizza loaded with spicy pepperoni.", categories: ["Spicy", "New"], price: 169, avgRating: 4.8, ratings: [], image: "pepperonipizza.jpg" },
      { _id: "23", name: "Jalebi", description: "Sweet spirals soaked in syrup.", categories: ["Sweet", "Popular"], price: 40, avgRating: 4.7, ratings: [], image: "jalebi.jpg" },
      { _id: "24", name: "Gulab Jamun", description: "Soft milk solids in sweet syrup.", categories: ["Sweet", "New"], price: 50, avgRating: 4.8, ratings: [], image: "gulabjamun.jpg" }
    ];

    await Item.insertMany(items24);
    console.log("✅ 24 items seeded successfully");
  } catch (err) {
    console.log("Seed error:", err.message);
  }
}

app.post(
"/create-order",
async (req,res)=>{

try{

const { amount } =
req.body;

const order =
await razorpay.orders.create({

amount:
amount * 100,

currency:
"INR",

receipt:
"receipt_" +
Date.now()

});

res.json(order);

}

catch(err){

console.log(err);

res.status(500).json({

message:
"Order creation failed"

});

}

});
app.get("/", (req, res) => {
  res.send("BUJJI BAJJI BACKEND RUNNING 🚀");
});
mongoose.connect(
process.env.MONGO_URI,
  { serverSelectionTimeoutMS: 5000 }
)
.then(async () => {
  console.log("✅ MongoDB Connected");
  // await seedItems();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})
.catch((err) => {
  console.log("❌ DB ERROR:", err.message);
});

/* =========================
   🔍 DEBUG
========================= */

mongoose.connection.on("connected", () => {
  console.log("🟢 Mongoose connected");
});

mongoose.connection.on("error", (err) => {
  console.log("🔴 Mongoose error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ Mongoose disconnected");
});