const mongoose = require('mongoose');

const userDetailsSchema = new mongoose.Schema({
    userId: { type: Number, unique: true },
    username: String,
    firstName: String,
    lastName: String,
    payStatus: { type: String, default: "pending" },
    paymentMethod: String

}, { timestamps: true });



const UserDetails = mongoose.model('Users', userDetailsSchema);


module.exports = UserDetails