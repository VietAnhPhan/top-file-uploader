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

const multer = require("multer");
const upload = multer({ dest: "public/uploads/" });
const fs = require("node:fs");
const { error } = require("node:console");

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

app.get("/", async (req, res) => {
  const folders = await prisma.folder.findMany({
    include: {
      file: true,
    },
    where: {
      userId: req.user.id,
    },
  });

  const files = await prisma.file.findMany({
    where: {
      userId: req.user.id,
      folderId: null,
    },
  });

  res.render("index", {
    title: "Home page",
    user: req.user,
    folders: folders,
    files: files,
  });
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

app.post("/upload", upload.single("file"), async (req, res) => {
  const folderId = parseInt(req.body.folder_id);

  if (!req.file) {
    throw new Error("File is not attacthed");
  }

  const file = {
    name: req.file.filename,
    file_type: req.file.mimetype,
    userId: req.user.id,
    folderId: folderId,
  };

  await prisma.file.create({
    data: file,
  });

  res.redirect("/");
});

app.post("/folders/create", async (req, res) => {
  const folderName = req.body.folder_name;
  const folderPath = path.join(__dirname, `public/uploads/${folderName}`);

  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
      await prisma.folder.create({
        data: {
          name: folderName,
          userId: req.user.id,
        },
      });
    }
    res.redirect("/");
  } catch (err) {
    console.error(err);
  }
});

app.post("/folders/delete", async (req, res) => {
  const folderId = parseInt(req.body.folder_id);
  const folderName = req.body.folder_name;
  const folderPath = path.join(__dirname, `public/uploads/${folderName}`);

  try {
    if (fs.existsSync(folderPath)) {
      fs.rmdir(folderPath, (err) => {
        if (err) {
          throw err;
        }
      });
    }

    await prisma.folder.delete({
      where: {
        id: folderId,
      },
    });

    res.redirect("/");
  } catch (err) {
    console.error(err);
  }
});

app.post("/folders/edit", async (req, res) => {
  const folderId = parseInt(req.body.folder_id);
  const folderOldName = req.body.folder_old_name;
  const folderOldPath = path.join(__dirname, `public/uploads/${folderOldName}`);

  const folderNewName = req.body.folder_new_name;
  const folderNewPath = path.join(__dirname, `public/uploads/${folderNewName}`);

  try {
    if (fs.existsSync(folderOldPath)) {
      fs.rename(folderOldPath, folderNewPath, (err) => {
        if (err) {
          throw err;
        }
      });
    }

    await prisma.folder.update({
      where: {
        id: folderId,
      },
      data: {
        name: folderNewName,
      },
    });

    res.redirect("/");
  } catch (err) {
    console.error(err);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Listen on port: ${process.env.PORT}`);
});
