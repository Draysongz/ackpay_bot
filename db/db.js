const mongoose = require('mongoose')
const dotenv = require('dotenv').config()



const connectDB = async ()=>{
    try {
        const conn = await mongoose.connect(process.env.MONGO_URL)
        console.log(`Db connected : ${conn.connection.name}`)
    } catch (error) {
        console.error(error)
    }
}

module.exports={
    connectDB
}