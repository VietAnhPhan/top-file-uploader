require("dotenv").config();

const express = require("express");

const path = require("path");
const passport = require("passport");

const session = require("express-session");
// const db = require("./db/pool");

const { PrismaSessionStore } = require("@quixo3/prisma-session-store");
const { PrismaClient } = require("./generated/prisma");
const { body, validationResult } = require("express-validator");

const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const app = express();

app.set("view engine", "ejs");
app.set("view engine", "ejs");

// require("./configs/passport");

passport.use(
  new LocalStrategy(
    {
      usernameField: "user_name",
      passportField: "password",
    },
    async (username, password, done) => {
      try {
        const user = await prisma.user.findFirst({
          where: {
            user_name: username,
          },
        });

        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
          return done(null, false, { message: "Incorrect password" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: id,
      },
    });

    done(null, user);
  } catch (err) {
    done(err);
  }
});

app.use(
  session({
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // ms
    },
    secret: "a santa at nasa",
    resave: true,
    saveUninitialized: true,
    store: new PrismaSessionStore(new PrismaClient(), {
      checkPeriod: 2 * 60 * 1000, //ms
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
  })
);

app.use(passport.session());
app.use(express.urlencoded({ extended: false }));
app.use("/static", express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Home page", user: req.user });
});

app.get("/sign-up", (req, res) => {
  res.render("signup", { title: "Sign up" });
});

app.post(
  "/sign-up",
  body("user_name")
    .trim()
    .custom(async (value) => {
      const user = await prisma.user.findFirst({
        where: {
          user_name: value,
        },
      });
      if (user) {
        throw new Error("Username already in use");
      }
    }),
  body("password")
    .trim()
    .isLength({ min: 8 })
    .withMessage("Password must have at least 8 letters"),
  body("repeat_password")
    .custom((value, { req }) => {
      return value === req.body.password;
    })
    .withMessage("Repeat password must match"),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).render("signup", {
          title: "Failed to create the user",
          errors: errors.array(),
        });
      }

      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      let userRole = "";

      if (req.body.admin_role === "admin") {
        userRole = "admin";
      }

      const user = {
        user_name: req.body.user_name,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        password: hashedPassword,
        role: userRole,
      };

      const createdUser = await prisma.user.create({
        data: user,
      });

      //   const createdUser = await prisma.user.findFirst({
      //     where: {
      //       user_name: user.user_name,
      //     },
      //   });

      //   res.render("index", { title: "Home page", user: createdUser });

      //   req.login(createdUser, (err) => {
      //     if (!err) {
      //       res.redirect("/");
      //     } else {
      //       next(err);
      //     }
      //   });

      res.redirect("/");
    } catch (error) {
      console.log(`Error creating user: ${error}`);
      res.status(500).send("Can not create new user");
    }
  }
);

app.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/log-in",
  })
);

app.get("/log-in", (req, res) => {
  res.render("index", {
    title: "Login here",
  });
});

app.listen(process.env.PORT, () => {
  console.log(`Listen on port: ${process.env.PORT}`);
});
