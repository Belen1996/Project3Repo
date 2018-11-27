module.exports = function(app) {

    const fs   = require('fs');
    const jwt  = require('jsonwebtoken');

    const passport = require('passport');
    const LocalStrategy = require('passport-local').Strategy;
    const passportJWT = require('passport-jwt');
    const JWTStrategy = passportJWT.Strategy;

    var privateKEY  = fs.readFileSync('../config/keys/private.key', 'utf8');
    var publicKEY  = fs.readFileSync('../config/keys/public.key', 'utf8');

    var db = require("../models");

    passport.use(new LocalStrategy({
        usernameField: email,
        passwordField: password,
      }, async (email, password, done) => {
        try {
            db.users.findOne({where: {Email: email, Password: password}, raw: true}).then(
                user => {
                    if(user) {
                        return done(null, user);
                    } else {
                        return done('Incorrect Username / Password');
                    }
                }, 
                error => {
                    console.error("Unable to retrieve user: " + JSON.stringify(error));
                    return done('Incorrect Username / Password');
                } 
            );
        } catch (error) {
          done(error);
        }
      }));

    passport.use(new JWTStrategy({
        jwtFromRequest: req => req.cookies.session,
        secretOrKey: privateKEY,
      },
      (jwtPayload, done) => {
        if (jwtPayload.expires > Date.now()) {
          return done('jwt expired');
        }
        return done(null, jwtPayload);
      }
    ));

    // POST /register
    // --------------
    //
    // Inputs: { name, email, cellphone, password }
    // Output: 201 => Registration successful.
    //         400 => Bad input. Params do not validate.
    //         401 => Wrong user or wrong password
    //         500 => Server error 
    //
    app.post('/register', function(req, res) {
        const { name, email, cellphone, password } = req.body;

        db.users.findOne({where: {Email: email}, raw: true}).then(
            user => {
                if(!user) {
                    db.users.create({User_Name: name, Email: email, Password: password, Cell_Phone: cellphone}).then(
                        user => {
                            res.status(201)
                               .json({});
                        },
                        error => {
                            console.error("Unable to create user: " + JSON.stringify(error));
                            res.status(500)
                               .send({error: "Unable to create user"});
                        }
                    );
                } else {
                    res.status(400)
                       .send({error: "A user already exists with that email address"});
                }
            },
            error => {
                console.error("Unable to create user: " + JSON.stringify(error));
                res.status(500)
                   .send({error: "Unable to create user"});}
        );
    });


    // POST /login
    // -----------
    //
    // Inputs: { email, password }
    // Output: 200 => Log in successful. Creates a JWT token in a cookie named 'session'. This session information have userId.
    //         400 => Bad input. Params do not validate.
    //         401 => Wrong user or wrong password
    //         500 => Server error 
    //
    app.post('/login', function(req, res) {
        passport.authenticate(
          'local',
          { session: false },
          (error, user) => {
      
            if (error || !user) {
              res.status(401)
                 .json({ error: "Invalid Email or password" });
            }
      
            const payload = {
                userId: user.user_id, 
                userName: user.User_Name,
                expires: Date.now() + parseInt(process.env.JWT_EXPIRATION_MS),
            };
      
            req.login(payload, {session: false}, (error) => {
              if (error) {
                res.status(400)
                   .send({ error });
              }
      
              const token = jwt.sign(JSON.stringify(payload), keys.secret);
      
              res.cookie('session', token, { httpOnly: true, secure: true });
              res.redirect("/");
            });
          },
        );
    });

};

