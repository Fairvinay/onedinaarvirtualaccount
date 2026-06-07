const {mongoose} = require('./mongoose-setup');
//const uniqueValidator = require('mongoose-unique-validator');
//const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const bcrypt = require('bcryptjs');

let NiftyAllIndicesSchema = new mongoose.Schema({
    encodedHtml: { type: String  },
   updatedAt: { type: Date, default: Date.now },
        /**
          , { 
  timestamps: true // Automatically tracks createdAt and updatedAt fields
}
         */
});

NiftyAllIndicesSchema.methods.toJSON = function () {
    let niftyIndices = this;
    let niftyIndicesObject = niftyIndices.toObject();
    return _.pick(niftyIndicesObject, ['_id', 'encodedHtml',   'updatedAt']);
    //return _.pick(userObject, ['_id', 'email', 'name']);
};
/* 
NifyAllIndices.methods.generateAuthToken = function () {
    let niftyIndices = this;
    let access = 'auth';
    let token = jwt.sign({_id: user._id.toHexString(), access}, process.env.SALT).toString();

    user.tokens = user.tokens.concat([{access, token}]);

    return user.save().then(() => {
        return token;
    });
};

UserSchema.methods.removeToken = function (token) {
    let user = this;

   
    return this.updateOne({
        $pull: {
            tokens: { token }
        }
    });
};

UserSchema.statics.findByToken = function (token) {
    let User = this;
    let decoded;

    try {
        console.log("UserSchema.statics.findByToken  ")
        console.log("process.env.SALT  "+process.env.SALT)

        decoded = jwt.verify(token, process.env.SALT);
    } catch (e) {
        return Promise.reject();
    }

    return User.findOne({
        '_id': decoded._id,
        'tokens.token': token,
        'tokens.access': 'auth'
    });
};

UserSchema.statics.findByCredentials = function (email, password) {
    let User = this;

    return User.findOne({email}).then((user) => {
        if (!user) {
        return Promise.reject();
        }
        console.log("UserSchema.statics.findByCredentials ")
        console.log("to search  email "+email )
        console.log("user  email "+user.email )
        return new Promise((resolve, reject) => {
        // Use bcrypt.compare to compare password and user.password
            bcrypt.compare(password, user.password, (err, res) => {
                if (res) {
                    resolve(user);
                } else {
                    reject();
                }
            });
        });
    });
};

UserSchema.pre('save', function (next) {
    let user = this;
    console.log("UserSchema.pre "+JSON.stringify(user) )

    if (user.isModified('password')) {
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(user.password, salt, (err, hash) => {
                user.password = hash;
                next();
            });
        });
    } else {
        next();
    }
});
*/
/**  improved 
 UserSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});
   
 */
//UserSchema.plugin(uniqueValidator)

let NiftyAllIndices = mongoose.model('NiftyAllIndices', NiftyAllIndicesSchema);

module.exports = { NiftyAllIndices }
