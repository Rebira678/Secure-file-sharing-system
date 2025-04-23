// models/Request.js
const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
  file: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "File", 
    required: true 
  },
  requester: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  status: { 
    type: String, 
    enum: ["pending", "approved", "rejected"], 
    default: "pending" 
  },
  message: {
    type: String,
    default: ""
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  processedAt: {
    type: Date
  }
});

const Request = mongoose.model("Request", requestSchema);

module.exports = Request;