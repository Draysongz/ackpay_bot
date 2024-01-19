const mongoose = require('mongoose');


// Define the schema for the marketer model
const marketerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    freeSlots: {
        type: Number,
        default: 0
    }
});

// Create the marketer model using the schema
const Marketer = mongoose.model('Marketer', marketerSchema);

// Export the model for use in other parts of your application
module.exports = Marketer;
