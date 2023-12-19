import './config.mjs';
import * as db from './db.mjs';
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import sanitize from 'mongo-sanitize';
// import bcrypt from 'bcrypt';
import multer from 'multer';
const storage = multer.diskStorage({
    destination: (req,file, cb)=>{
        cb(null, 'public/images')
    },
    filename: (req,file, cb)=>{
        // console.log(file);
        cb(null,Date.now() +  path.extname(file.originalname))
    }
})

// middleware for uploading an image
const upload = multer({storage: storage});
// https://www.youtube.com/watch?v=wIOpe8S2Mk8

// const User = mongoose.model('User');
// const OOTD = mongoose.model('OOTD');

const User = db.User;
const OOTD = db.OOTD;


// set up express static
const app = express();

// configure templating to hbs
app.set('view engine', 'hbs');


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({extended: false}));

const sessionOptions = {
    secret: 'secret for signing session id',
    saveUninitialized: false,
    resave: false
}

app.use(session(sessionOptions));

// Modify the root route to check if the user is already logged in
const isAuthenticated = async (req, res, next) => {
    if (req.session.username) {
        try {
            const allOOTDs = await OOTD.find();
            res.locals.allOOTDs = allOOTDs; // Make allOOTDs available to the next middleware or route handler
            res.locals.username = req.session.username; // Make username available to the next middleware or route handler
            next(); // Continue to the next middleware or route handler
        } catch (error) {
            res.status(500).send('Internal Server Error');
        }
    } else {
        res.redirect('/login');
    }
};

// Use the isAuthenticated middleware in your route handler
app.get('/', isAuthenticated, (req, res) => {
    // The user is authenticated, and allOOTDs and username are available in res.locals
    res.render('home', { allOOTDs: res.locals.allOOTDs, username: res.locals.username });
});

// Modify the registration route to redirect to the root route if the user is already logged in
app.get('/register', (req, res) => {
    // if (req.session.username) {
    //     res.redirect('/', {username: req.session.username});
    // } else {
    //     res.render('registration');
    // }

    User.register(new User({username: req.body.username}), req.body.password, function(err,user){
        if(err){
            res.render('registration');
        } else{
            passport.authenticate('local')(req,res,function(){
                res.redirect('/');
            });
        }
    }); //https://www.youtube.com/watch?v=F-sFp_AvHc8
});

app.post('/register', async (req, res) => {

    const cleanUsername = sanitize(req.body.username);

    // search for the existing user
    const foundUser = await User.findOne({ username: cleanUsername });

    // console.log(req.body.username);

    // if it's found, show error message (duplicate user)
    if (foundUser) {
        res.render('registration', { error: 'duplicate user' });
    } else {
        try {
            // Hash the password using bcrypt
            // const hashedPassword = await bcrypt.hash(req.body.password, saltRounds); 

            const cleanPassword = sanitize(req.body.password);

            const u = new User({
                username: cleanUsername,
                password: cleanPassword
            });

            const savedUser = await u.save();

            // setting the session username as the one that you just registered
            req.session.username = savedUser.username;

            res.redirect('/');
        } catch (e) {
            console.log(e);
            res.render('registration', { error: 'Unable to register' });
        }
    }
});
  

// Add a new route for the login page
app.get('/login', (req, res) => {

    if (req.session.username) {
        res.redirect('/', {username: req.session.username});
    } else {
        res.render('login');
    }
});

// Add a new route to handle the login post request
app.post('/login', async (req, res) => {

    const { username, password } = req.body;

    const cleanUsername = sanitize(username);
    console.log("username:",cleanUsername);
    const cleanPassword = sanitize(password);
    console.log("password:",cleanPassword);


    try {
        const user = await User.findOne({username: cleanUsername});

        // console.log("res.header.location:", res.get('location'));

        if (user) {
            if(cleanPassword == user.password){
                // Set the session username if login is successful
                req.session.username = user.username;
                // res.location('/');
                res.redirect('/');
            } else {
                // Show error message if passwords don't match
                res.render('login', { error: 'Invalid credentials' });
            }
        } else {
            // Show error message if user not found
            res.render('login', { error: 'Invalid credentials' });
        }
    } catch (e) {
        console.log(e);
        res.render('login', { error: 'Unable to login' });
    }
});




app.get('/add', (req, res) => {
    if (req.session.username) {
        res.render('add', {username: req.session.username});
    } else {
        res.redirect('/login');
    }
});

app.post('/add', upload.single('image'), async(req,res)=>{

    // console.log(req.file.filename);

    if(req.session.username){

        const cleanTitle = sanitize(req.body.title);
        const cleanBrands = sanitize(req.body.brands);


        const newOotd = {
            title: cleanTitle,
            brands: cleanBrands,
            picture: req.file.filename,
            author: req.session.username
        }
        const savedOotd = await new OOTD(newOotd).save();

        const updatedUser = await User.findOneAndUpdate(
            {username:req.session.username}, 
            {$push: {OOTD:newOotd}}
        );

        res.redirect('/u/' + updatedUser.username);
    }
    else{
        res.render('login');
    }
})

app.get('/u/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        const userOOTD = await OOTD.find({author: req.params.username});

        if (user) {
            res.render('profile', { userOOTD, username: req.session.username });
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

app.get('/ootd/:id', async (req, res) => {
    try {
        const ootdId = req.params.id;
        const ootd = await OOTD.findById(ootdId);

        if (ootd) {
            res.render('detail', { ootd, username: req.session.username });
        } else {
            res.status(404).send('OOTD not found');
        }
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle adding comments
app.post('/addComment/:ootdId', async (req, res) => {
    const ootdId = req.params.ootdId;
    const { commentText } = sanitize(req.body);

    try {
        // Find the OOTD by ID
        const ootd = await OOTD.findById(ootdId);

        if (!ootd) {
            // Handle case where OOTD is not found
            res.status(404).send('OOTD not found');
            return;
        }

        // Add the new comment to the OOTD's comments array
        ootd.comments.push({
            text: commentText,
            author: req.session.username,  // Assuming you have user authentication and a session
            createdAt: new Date(),
        });

        // Save the updated OOTD with the new comment
        await ootd.save();

        // Redirect back to the OOTD detail page
        res.redirect(`/ootd/${ootdId}`);
    } catch (error) {
        // Handle errors
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/delete', (req,res)=>{

    if(req.session.username){
        res.render('delete', {username: req.session.username});
    }
    else{
        res.redirect('home');
    }
    
})


const isAuthenticatedAndOwnsOOTD = async (req, res, next) => {
    try {
        const deletedTitle = req.body.title;

        // Check if the authenticated user owns the OOTD
        const ownsOOTD = await OOTD.findOne({ title: deletedTitle, author: req.session.username });

        if (req.session.username && ownsOOTD) {
            next(); // Continue to the next middleware or route handler
        } else {
            res.status(403).send('Unauthorized');
        }
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
};

app.post('/delete', isAuthenticatedAndOwnsOOTD, async (req, res) => {
    // The user is authenticated and owns the OOTD, proceed with deletion
    try {
        const deletedTitle = sanitize(req.body.title);

        const deletedOOTD = await OOTD.findOneAndDelete({ title: deletedTitle });

        // Remove the OOTD reference from the user's OOTD array
        const updatedUser = await User.findOneAndUpdate(
            { username: req.session.username },
            { $pull: { OOTD: { title: deletedTitle } } },
            { new: true }
        );

        res.redirect('/u/' + updatedUser.username);
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});


app.get('/about', (req,res)=>{
    try{

        res.render('about', {username: req.session.username});

    }catch (error){
        res.status(500).send('Internal Server Error');
    }
})

app.listen(process.env.PORT ?? 3000);

export default app;