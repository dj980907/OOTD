import mongoose from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose'

console.log("this is the database we are using ------>",process.env.DSN);
mongoose.connect(process.env.DSN);

// Comment Schema
const commentSchema = new mongoose.Schema({
    text: { type: String, required: true },
    author: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

// OOTD Schema (Outfit of the Day)
const ootdSchema = new mongoose.Schema({
    title: { type: String, required: true },
    brands: String,
    picture: String,
    author: String,
    description: String,
    comments: [commentSchema], // Reference to comments using an array
    createdAt: { type: Date, default: Date.now },
});


const userSchema = new mongoose.Schema({
    username: {type: String, unique: true, minlength:8},
    password: {type: String},
    OOTD: [],
    createdAt: { type: Date, default: Date.now }
})

userSchema.plugin(passportLocalMongoose);

// mongoose.model('User', userSchema);
// mongoose.model('OOTD', ootdSchema);

export const User = mongoose.model('User', userSchema);
export const OOTD = mongoose.model('OOTD', ootdSchema);