const express = require("express")
const router = express.Router()
const _ = require("lodash")

const { authenticate } = require("../middleware/authenticate")
const { User } = require("../models/user")
const { Money } = require("../models/model"); // Adjust path as needed
 
router.post("/signupold", (req, res) => {
    let body = _.pick(req.body, ["email", "password", "name"])
      newbody = { userSalt : 833492, underlyingOrderId : '4dg94egxsg' , activationDate:Date.now() , ...body }
    console.log(" /signup ")
      console.log(" user from frontend "+JSON.stringify(newbody))
    let user = new User(newbody)

    user.save().then(() => {

        // --- ADD THIS BLOCK ---
        // Create the default $10,000 for the new user
        let initialMoney = new Money({
            money: 10000,
            _creator: user._id
        });
        return initialMoney.save(); 


       
       // return user.generateAuthToken()
    }).then(() => {
        console.log(" user saved , authgeneration "+JSON.stringify(body))

        return user.generateAuthToken()
    })
    
    
    .then((token) => {
        res.header('x-auth', token).send(user)
    }).catch(err => {
        res.status(400).send(err)
    })
}) 
router.post("/signup", (req, res) => {
    // Pick the extended fields from the frontend payload
    let body = _.pick(req.body, ["email", "password", "name", "userSalt", "underlyingOrderId"]);
        newbody = { userSalt : 833492, underlyingOrderId : '4dg94egxsg' , activationDate:Date.now , ...body }
    let user = new User(body);

    user.save().then(() => {
        // Initialize the $10,000 virtual balance
        let initialMoney = new Money({
            money: 10000,
            _creator: user._id
        });
        return initialMoney.save(); 
    }).then(() => {
        return user.generateAuthToken();
    }).then((token) => {
        // Send back x-auth for session persistence
        res.header('x-auth', token).send(user);
    }).catch(err => {
        // Handle Duplicate Order ID or Validation errors
        res.status(400).send({
            error: "Registration Failed",
            message: err.code === 11000 ? "Order already linked to an account" : err.message
        });
    });
});

router.get("/me", authenticate, (req, res) => {
    res.send(req.user)
})

router.post("/login", (req, res) => {
    let body = _.pick(req.body, ["email", "password"])

    User.findByCredentials(body.email, body.password).then(user => {
        return user.generateAuthToken().then(token => {
            res.header('x-auth', token).send(user)
        })
    }).catch(err => {
        res.status(400).send(err)
    })
})

router.delete("/logout", authenticate, (req, res) => {
    req.user.removeToken(req.token).then(() => {
        res.status(200).send("logged out")
    }).catch(err => {
        res.status(400).send(err)
    })
})

router.get("/leaderboard", (req, res) => {
    User.aggregate([
        {
            $lookup:
                {
                    from: "portfolios",
                    localField: "_id",
                    foreignField: "_creator",
                    as: "portfolio"
                }
        },
        {
            $lookup:
                {
                    from: "money",
                    localField: "_id",
                    foreignField: "_creator",
                    as: "money"
                }
            }
        ]).then(data => {
            leaderboard = []
            data.map(user => {

                // Safe check: If money[0] doesn't exist, default to 10000
              const userMoney = (user.money && user.money[0]) ? user.money[0].money : 10000;
               // money = user.money[0].money
                shareWorth = 0
                user.portfolio.map(port => {
                    shareWorth += port.shareWorth
                })

                leaderboard_data = {
                    creator: user._id,
                    name: user.name,
                    profitLoss: (userMoney + shareWorth - 10000).toFixed(2)
                }

                leaderboard.push(leaderboard_data)
            })
            leaderboard.sort((a,b) => {
                return b.profitLoss - a.profitLoss
            })
            res.send(leaderboard)
        }).catch(err => {
            res.status(500).send({ error: "Leaderboard calculation failed" });
        });
})

module.exports = router
