/** It modifies stored user data & returns a value.
 * It can be used to perform CRUD operations.
 * Mutations are defined as a part of the schema.
 * @sync
 * @param {string} args -   User Validations based on the input.
 * @return {Error}      -   The data from the input given.
 */

const userModel = require('../../model/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const secret = process.env.SECRET;
const mail = require('../../sendEmail/sendEmail');
let url = process.env.GRAPHQL_URL;
let shortUrl = require('node-url-shortener');

exports.register = async (parent, args, context) => {
    // validate user first name
    if (args.firstName === null) {
        throw new Error('First name cannot be blank.')
    }

    // validate user last name
    if (args.lastName === null) {
        throw new Error('Last name cannot be blank.')
    }

    if (args.firstName.length < 3 || args.lastName.length < 3) {
        throw new Error('Minimum of 3 characters required.')
    }

    // validate e-mail
    const emailRegex = /^[a-zA-Z]+([+-_.][a-zA-Z0-9])*[0-9]*\@[a-z0-9]+[.]([a-z]{2,4}[.])?[a-z]{2,4}$/;
    if (args.emailId === null) {
        throw new Error('E-mail can not be blank. Please try entering a valid e-mail.');
    }
    if (!emailRegex.test(args.emailId)) {
        throw new Error('Invalid e-mail');
    }

    // validate password
    if (args.password === null) {
        throw new Error('Password can not be blank. Please Enter a 8-character long password');
    }
    if (args.password.length < 8) {
        throw new Error('password must be atleast 8 characters long');
    }

    // check for user
    const user = await userModel.find({
        emailId: args.emailId
    });
    if (user.length > 0) {
        throw new Error('e-mail already registered');
    }

    password = await bcrypt.hash(args.password, 12);

    const newUser = new userModel({
        firstName: args.firstName,
        lastName: args.lastName,
        emailId: args.emailId,
        password: password
    });

    // save user
    const saveUser = await newUser.save();

    if (saveUser) {
        return {
            message: 'Registration Success!',
            success: true
        };
    } else {
        return {
            message: 'Registration Failed!',
            success: false
        };
    }
}

exports.login = async (parent, args, context) => {
    let user = await userModel.findOne({
        emailId: args.emailId
    });
    let comparePass = await bcrypt.compare(args.password, user.password)
    if (comparePass) {
        let token = jwt.sign(
            {
                emailId: user.emailId
            }, secret, { expiresIn: "12d" });
        return {
            message: 'Login successful',
            success: true,
            token: token
        }
    }
    return {
        message: 'Invalid password. Authentication failed',
        success: false,
        token: 'invalid'
    }
}

exports.forgotPassword = async (parent, args, context) => {
    let user = await userModel.findOne({
        emailId: args.emailId
    });
    if (user) {
        let token = jwt.sign(
            {
                emailId: user.emailId
            }, secret, { expiresIn: '12d' });
        this.urlShort(mail.sendEmail(url + token));
        return {
            message: 'E-mail sent to change password.',
            success: true
        }
    } else {
        return {
            message: 'Not a valid request.',
            success: false
        }
    }
}

exports.resetPassword = async (parent, args, context) => {
    let userAuthorization = jwt.verify(context.authorization, secret);
    console.log(userAuthorization)
    if (!userAuthorization) {
        throw new Error("Invalid user token authentication")
    }
    console.log(userAuthorization.emailId);
    let user = userModel.findOne({ emailId: userAuthorization.emailId });
    if (!user) {
        throw new Error("Invalid password reset link")
    }
    let newPass = bcrypt.hash(args.newPass, 12)
    let updateUser = user.update(
        { password: newPass });
    if (updateUser) {
        return {
            message: 'Password successfully resetted.',
            success: true
        }
    } else {
        return {
            message: 'Entered passwords don\'t match.',
            success: false
        }
    }
}

exports.urlShort = urlShort => {
    shortUrl.short(urlShort, (err, urlShort) => {
        mail.sendEmail(urlShort);
    });
}