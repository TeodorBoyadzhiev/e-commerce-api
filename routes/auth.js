const router = require("express").Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const { default: axios } = require("axios");

//REGISTER
router.post('/register', async (req, res) => {
    if (req.body.showRecaptcha) {
        const result = await reCaptchaValidation(req.body.token);
        if (!result) {
            res.status(400).json('Recaptcha error');
            return;
        }
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const newUser = new User({
        username: req.body.username,
        email: req.body.email,
        password: hashedPassword
    });

    try {
        const savedUser = await newUser.save();
        res.status(201).json(savedUser);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
});


//LOGIN
router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        !user && res.status(401).json('Wrong credentials!');

        const hasMatch = await bcrypt.compare(req.body.password, user._doc.password);

        if (!hasMatch) {
            throw new Error('Incorect password');
        }

        const accessToken = await generateToken(user._doc);

        const { password, ...others } = user._doc;
        
        res.status(200).json(others, accessToken);
    } catch (err) {
        res.status(500).json(err);
        console.log(err)
    }

});

//LOGOUT
router.get('/logout', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });

        res.status(200);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
});


async function reCaptchaValidation(token) {
    try {
        const secret = process.env.RECAPTCHA_SECRET_KEY;
        const response = await axios(`https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`, { method: "POST" });
        return response.data.success;
    } catch (err) {
        return err;
    }
}

async function generateToken(userData) {
    return jwt.sign({
        _id: userData._id,
        username: userData.username,
        email: userData.email
    }, process.env.TOKEN_SECRET);
}


module.exports = router