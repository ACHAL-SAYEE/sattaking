require("dotenv").config();
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socketIO = require("socket.io");

const io = socketIO(server);
// {
//   cors: [{ origin: "http://localhost:5500" }],
// }
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const cron = require("node-cron");
const csrf = require("csurf");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
const session = require("express-session");
const MongoDBSession = require("connect-mongodb-session")(session);
const store = new MongoDBSession({
  uri: process.env.MONGO,
  collection: "sessions",
});
app.use(cookieParser());

// Use csrf middleware
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

app.use(express.json());
app.use(
  session({
    secret: "81d6b53533a31404d5da714034980d87fbfaca4e71b420e15315ae22a0b50b0c",
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      // sameSite:'None',
      sameSite: false,

      secure: false, // Set to true if using HTTPS
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
      // domain:"http://localhost:3000"
    },
    name: "SATAKINGID",
  })
);
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use((req, res, next) => {
  // req.domain = req.protocol + "://" + req.get("host");
  req.domain = "https" + "://" + req.get("host");

  next();
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Internal Server Error");
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "Sattakingspinner@gmail.com",
    pass: "gpxc rjti wqbs wcis",
  },
});

mongoose
  .connect(process.env.MONGO)
  .then(() => {
    console.log("Successfully connected to database");
  })
  .catch((e) => {
    console.log(e);
  });

const numberSchema = new mongoose.Schema({
  name: String,
  gameStartTime: String,
  gameEndTime: String,

  year: String,
  value: [
    {
      date: String,
      number: { type: Number, default: null },
    },
  ],
});
const cardSchema = new mongoose.Schema({
  details: String,
  number: String,
  uni: String,
});

// const SpinWheelSchema = new mongoose.Schema({
//   point: Number,
// });
const AdminSchema = new mongoose.Schema({
  email: String,
  password: String,
});
const PasswordTokenSchema = new mongoose.Schema({
  email: String,
  token: String,
  expires: Number,
});
const PasswordToken = mongoose.model("PasswordToken", PasswordTokenSchema);
const Game = mongoose.model("Game", numberSchema);
const Card = mongoose.model("Card", cardSchema);
const Admin = mongoose.model("Admin", AdminSchema);
// const SpinWheel = mongoose.model("SpinWheel", SpinWheelSchema);

var game = 0;

const isLoggedIn = (req, res, next) => {
  if (req.session.email) {
    next();
  } else {
    res.redirect("/login");
  }
};

app.get("/login", async (req, res) => {
  if (req.session.email) {
    res.redirect("/admin");
    return;
  }
  res.render("login", { error: false });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  let admin = await Admin.findOne({ email });
  console.log("admin ", admin);
  if (admin === null) {
    // res.redirect("/login");
    return res.render("login", { error: "User not found" });
  }
  const isMatched = await bcrypt.compare(password, admin.password);

  if (isMatched) {
    req.session.email = email;
    res.redirect("/admin");
  } else {
    // res.status(401).send("incorrect password");
    return res.render("login", {
      error: "Incorrect password",
      forgotPassword: true,
    });

    // res.redirect("/login");
  }
});

app.post("/add", isLoggedIn, async (req, res) => {
  // console.log("jvjjvvkj",req.body)
  let currDate = new Date();
  let currYear = currDate.getFullYear();
  const name = req.body.name;
  const gameEndTime = req.body.gameEndTime;
  const gameStartTime = req.body.gameStartTime;
  const spinNumber = req.body.spinNumber;
  // console.log(time);
  const num = await Game.findOne({ name: name, year: `${currYear}` });
  const allGames = await Game.find({ year: `${currYear}` });

  if (num) {
    game = 1;
    res.redirect("/admin");
  } else {
    const date = new Date();
    date.setDate(currDate.getDate() - 1);

    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    let date1 = day + "-" + month + "-" + year;
    let maxLen = -1;
    let maxIndex = 0;

    for (let i = 0; i < allGames.length; i++) {
      if (allGames[i].value.length > maxLen) {
        maxLen = allGames[i].value.length;
        maxIndex = i;
      }
    }
    console.log("maxIndex ", maxLen, "maxLen ", maxLen);

    let arr = [];
    for (let i = 0; i <= maxLen; i++) {
      if (allGames[maxIndex].value[i].date === date1) {
        break;
      }
      arr.push({ date: allGames[maxIndex].value[i].date });
    }
    console.log("arr after", arr);
    arr.push({ date: date1, number: spinNumber });
    const number = new Game({
      name,
      gameEndTime,
      year,
      gameStartTime,
      value: arr,
    });

    await number.save().then(() => {
      game = 0;
      res.redirect("/admin");
    });
  }
});
app.post("/delete", isLoggedIn, async (req, res) => {
  const name = req.body.name;
  await Game.deleteOne({ name: name })
    .then(() => {
      res.redirect("/admin/delete");
    })
    .catch((e) => {
      res.send(e);
    });
});

app.post("/card", isLoggedIn, async (req, res) => {
  const details = req.body.details;
  const number = req.body.number;
  let num = await Card.findOne({ uni: "1" });
  if (num) {
    num.details = details;
    num.number = number;
    await num.save().then(() => {
      res.redirect("/card");
    });
  } else {
    const card = new Card({
      details: details,
      number: number,
      uni: "1",
    });
    await card.save().then(() => {
      res.redirect("/card");
    });
  }
});

app.post("/add/value", isLoggedIn, async (req, res) => {
  const name = req.body.name;
  const value = req.body.value;
  const date = new Date();
  let day = date.getDate();
  let month = date.getMonth() + 1;
  let year = date.getFullYear();
  let date1 = day + "-" + month + "-" + year;
  let num = await Game.findOne({ name: name, year });
  let arr = num.value;
  let flag = 0;
  for (let i = 0; i < arr.length; i++) {
    if (date1 == arr[i].date) {
      arr[i].number = value;
      flag = 1;
      break;
    }
  }
  if (flag == 0) {
    const obj = {
      date: date1,
      number: value,
    };
    arr.push(obj);
    num.value = arr;
    await num
      .save()
      .then(() => {
        res.redirect("/admin/value");
      })
      .catch((e) => {
        res.send(e);
      });
  } else {
    num.value = arr;
    await num
      .save()
      .then(() => {
        res.redirect("/admin/value");
      })
      .catch((e) => {
        res.send(e);
      });
  }
});

app.get("/logout", async (req, res) => {
  req.session.destroy(function (err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

app.get("/admin", isLoggedIn, (req, res) => {
  res.render("add", { game: game });
  game = 0;
});
app.get("/card", isLoggedIn, (req, res) => {
  res.render("card");
});

app.get("/admin/editGame", isLoggedIn, async (req, res) => {
  let currDate = new Date();
  let currYear = currDate.getFullYear();
  let existingGames = await Game.find({ year: `${currYear}` }, { value: 0 });

  res.render("editGame", { existingGames, domain: req.domain });
});

app.get("/admin/delete", isLoggedIn, async (req, res) => {
  await Game.find()
    .then((found) => {
      res.render("delete", { parray: found, domain: req.domain });
    })
    .catch((e) => {
      res.send(e);
    });
});
app.get("/admin/value", isLoggedIn, async (req, res) => {
  await Game.find()
    .then((found) => {
      res.render("update", { parray: found, domain: req.domain });
    })
    .catch((e) => {
      res.send(e);
    });
});

function TimeLiesInInterval(
  gameStartTime,
  gameEndTime,
  currentHour,
  currentMinute
) {
  gameStartTime = gameStartTime.split(":").map(Number);
  gameEndTime = gameEndTime.split(":").map(Number);

  let gameStartHour = gameStartTime[0];
  let gameStartMinute = gameStartTime[1];
  let gameEndHour = gameEndTime[0];
  let gameEndMinute = gameEndTime[1];
  if (
    (currentHour > gameStartHour ||
      (currentHour === gameStartHour && currentMinute >= gameStartMinute)) &&
    (currentHour < gameEndHour ||
      (currentHour === gameEndHour && currentMinute <= gameEndMinute))
  ) {
    return true;
  }
  return false;
}

function TimeLiesAfter(gameEndTime, currentHour, currentMinute) {
  gameEndTime = gameEndTime.split(":").map(Number);
  let gameEndHour = gameEndTime[0];
  let gameEndMinute = gameEndTime[1];
  if (
    currentHour > gameEndHour ||
    (currentHour === gameEndHour && currentMinute >= gameEndMinute)
  )
    return true;
  return false;
}

app.get("/", async (req, res) => {
  try {
    let yeartoshow = req.query.year;

    // .then(async (found) => {
    // console.log("parray", found);
    let prev = false;
    const date = new Date();
    let day = date.getDate();
    let currentHour = date.getHours();
    let currentMinute = date.getMinutes();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    let date1 = day + "-" + month + "-" + year;
    if (yeartoshow === undefined) {
      yeartoshow = year.toString();
    }
    const found = await Game.find({ year: `${year}` });

    // console.log("date1", date1,hour);

    found.sort(function (a, b) {
      // Extract the time strings from objects 'a' and 'b'
      // console.log("aaa ", a.gameStartTime);
      // console.log("bbb ", b.gameStartTime);

      var timeA = a.gameStartTime.split(":").map(Number);
      var timeB = b.gameStartTime.split(":").map(Number);

      // Compare the hours
      if (timeA[0] !== timeB[0]) {
        return timeA[0] - timeB[0];
      }

      // If hours are equal, compare the minutes
      return timeA[1] - timeB[1];
    });
    let found2;
    console.log("yeartoshow ", yeartoshow, "year ", year);
    if (yeartoshow == year) {
      // console.log("chosen");
      found2 = found;
    } else {
      found2 = await Game.find({ year: yeartoshow });
    }
    // console.log("found", found);
    // console.log("found2", found2);

    let nearestGame = null;
    let isGameRunning = false;
    let isGameEnded = false;
    let gameIndex;
    for (let i = 0; i < found.length; i++) {
      let game = found[i];

      if (
        TimeLiesInInterval(
          game.gameStartTime,
          game.gameEndTime,
          currentHour,
          currentMinute
        )
      ) {
        isGameRunning = true;
        gameIndex = i;
        break;
      } else {
        // console.log("eeeeeee");
        //   if (i === 0 ) {
        //     if (TimeLiesAfter(found[i].gameEndTime, currentHour, currentMinute)) {
        //       isGameEnded = true;
        //       gameIndex = i;
        //       break;
        //     } else {
        //     }
        //   }
        // else
        if (i > 0 && i <= found.length - 1) {
          if (
            TimeLiesInInterval(
              found[i - 1].gameEndTime,
              found[i].gameStartTime,
              currentHour,
              currentMinute
            )
          ) {
            isGameEnded = true;
            gameIndex = i - 1;
            // console.log("hit");
            break;
          } else if (i === found.length - 1) {
            if (
              TimeLiesAfter(found[i].gameEndTime, currentHour, currentMinute)
            ) {
              // console.log("entered");

              isGameEnded = true;
              gameIndex = i;
              break;
            } else {
              // console.log("entered2");
              isGameEnded = true;
              gameIndex = i;
              prev = true;
              break;
            }
          }
        }
      }
    }
    let maxGameIndex = null;
    let maxGame = -1;
    for (let j = 0; j < found.length; j++) {
      if (found[j].value.length > maxGame) {
        maxGame = found[j].value.length;
        maxGameIndex = j;
      }
    }
    if (nearestGame === null) {
      nearestGame = found[found.length - 1];
    }
    // console.log("parray2", found);

    // console.log("nearestGame ", nearestGame);
    // console.log("JSON.stringify(parray[gameIndex])",JSON.stringify(found[gameIndex]))
    // let point = await SpinWheel.findOne({});
    let allGames = found.map((game1) => {
      let { _id, __v, value, ...rest } = game1.toObject();
      return rest;
    });
    const fou = await Card.findOne({ uni: "1" });
    console.log("gameIndex ", gameIndex);
    console.log("isGameEnded", isGameEnded);
    let isEndedGameValueSet = false;
    if (isGameEnded) {
      if (
        found[gameIndex].value[found[gameIndex].value.length - 1].date === date1
      ) {
        isEndedGameValueSet = true;
      }
    }
    console.log("isEndedGameValueSet", isEndedGameValueSet);

    res.render("index", {
      // nearestGame: nearestGame,
      isGameEnded,
      isGameRunning,
      gameIndex,
      parray: found,
      parray2: found2,
      date: date1,
      description: fou ? fou.details : "",
      number: fou ? fou.number : "",
      yeartoshow,
      prev,
      allGames,
      isEndedGameValueSet,
      // point: point.point,
      maxGameIndex,
      domain:req.domain,
    });
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

app.get("/gameResult", async (req, res) => {
  const { name } = req.query;
  let curr = new Date();
  const currYear = curr.getFullYear().toString();
  let currMonth = curr.getMonth().toString() + 1;
  let currDate = curr.getDate();
  let currentHour = curr.getHours();
  let currentMinute = curr.getMinutes();
  const game = await Game.findOne({ name, year: currYear });
  let gameResult;
  // console.log("gamy ", game);
  let isEndedGameValueSet = false;
  if (TimeLiesAfter(game.gameEndTime, currentHour, currentMinute)) {
    currDate = curr.getDate();
    currMonth = curr.getMonth() + 1;
    let dateString = `${currDate}-${currMonth}-${currYear}`;
    if (game.value[game.value.length - 1].date === dateString) {
      isEndedGameValueSet = true;
      gameResult = game.value[game.value.length - 1].number;
    } else {
      gameResult = null;
    }
    console.log("dateString456", dateString);
  } else {
    gameResult = null;
    // console.log("curr before", curr);
    // curr.setDate(currDate - 1);
    // console.log("curr after", curr);

    // currDate = curr.getDate();
    // currMonth = curr.getMonth() + 1;
    // console.log("currDate", currDate);
    // console.log("currMonth", currMonth);

    // let dateString = `${currDate}-${currMonth}-${currYear}`;
    // if (game.value.length >= 2) {
    //   console.log("dateString123", dateString);
    //   if (game.value[game.value.length - 2].date === dateString)
    //     gameResult = game.value[game.value.length - 2].number;
    //   else gameResult = game.value[game.value.length - 1].number;
    // } else {
    //   gameResult = game.value[0].number;
    // }
  }
  res.send({ gameResult, isEndedGameValueSet });
  console.log({ gameResult, isEndedGameValueSet });
});

app.get("/yesterdayResult", async (req, res) => {
  let currDate = new Date();
  let prevDate = new Date();
  prevDate.setDate(currDate.getDate() - 1);
  let currYear = currDate.getFullYear();
  let game = await Game.findOne({ name: req.query.name, year: `${currYear}` });
  let prevDateString = `${prevDate.getDate()}-${prevDate.getMonth()+1}-${prevDate.getFullYear()}`;
  let endval = game.value.length - 1;
  console.log("prevDateString",prevDateString," game.value[endval].date ",game.value[endval].date )
  if (game.value[endval].date === prevDateString) {
    res.send({number:game.value[endval].number});
    
  }
  else{
    res.send({number:game.value[endval-1].number});

  }
});
// app.get("/spinwheel", async (req, res) => {
//   res.render("spinwheel");
// });

// app.post("/spinwheel", async (req, res) => {
//   const { spinwheel } = req.body;
//   await SpinWheel.findOneAndUpdate({}, { point: spinwheel }, { upsert: true });
//   res.redirect("/spinwheel");
// });
app.get("/getServerTime", (req, res) => {
  const serverTime = new Date();
  res.json({ serverTime });
});

app.get("/forgot-password", async (req, res) => {
  res.render("forgotPassword");
});

app.post("/forgot-password", async (req, res) => {
  const email = req.body.email;
  let admin = await Admin.findOne({ email });
  if (admin === null) {
    return res.render("forgotPassword", { error: true });
  }
  let token;
  let resetLink;
  const existingToken = await PasswordToken.findOne({ email });
  if (existingToken !== null) {
    token = existingToken.token;
  } else {
    token = crypto.randomBytes(20).toString("hex");
    await PasswordToken.create({ email, token, expires: Date.now() + 3600000 });
    setTimeout(async () => {
      await PasswordToken.deleteOne({ token });
    }, 3600000);
  }
  // resetLink = `${process.env.domain}/reset-password?token=${token}`;
  resetLink = `${req.domain}/reset-password?token=${token}`;

  // Send reset email
  console.log("resetLink", resetLink);
  const mailOptions = {
    from: "Sattakingspinner@gmail.com",
    to: email,
    subject: "Password Reset",
    text: `Click the link to reset your password: ${resetLink}. this link expires in 1 hour`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      res.status(500).send("Error sending email");
    } else {
      console.log("Email sent:", info.response);
      res.send("Email sent successfully");
    }
  });
});

app.get("/reset-password", async (req, res) => {
  const token = req.query.token;
  const storedToken = await PasswordToken.findOne({ token });

  if (storedToken && Date.now() < storedToken.expires) {
    // Token is valid
    // Render a form for the user to input their new password
    res.render("resetPassword", { token });
  } else {
    // Token is invalid or expired
    res.status(400).send("Invalid or expired token");
  }
});

app.post("/reset-password", async (req, res) => {
  const token = req.body.token;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const storedToken = await PasswordToken.findOne({ token });

  console.log("password", password);
  console.log("confirmPassword", confirmPassword);
  console.log("storedToken", storedToken);
  if (storedToken && Date.now() < storedToken.expires) {
    if (password !== confirmPassword) {
      return res.render("resetPassword", {
        error: "password and confirmPassword did not match",
        token,
      });
    }
    const hash = await bcrypt.hash(password, 10);
    await Admin.updateOne({ email: storedToken.email }, { password: hash });
    res.send("Password reset successfully");
    await PasswordToken.deleteMany({ email: storedToken.email });
  } else {
    // Token is invalid or expired
    res.status(400).send("Invalid or expired token");
  }
});

app.get("/changePassword", isLoggedIn, async (req, res) => {
  res.render("changePassword");
});

app.post("/changePassword", isLoggedIn, async (req, res) => {
  const { OldPassword, NewPassword, ConfirmPassword } = req.body;
  let currUser = await Admin.findOne({ email: req.session.email });
  if (NewPassword !== ConfirmPassword) {
    return res.render("changePassword", {
      error: "password and confirm password do not match",
    });
  }
  let isOldPasswordMatched = await bcrypt.compare(
    OldPassword,
    currUser.password
  );
  if (!isOldPasswordMatched) {
    return res.render("changePassword", {
      error: "old password does not match",
    });
  }
  let newhash = await bcrypt.hash(NewPassword, 10);
  await Admin.updateOne({ email: req.session.email, password: newhash });
  res.send("password changed successfully");
});

app.post("/editGame", isLoggedIn, async (req, res) => {
  const { name, newName, gameStartTime, gameEndTime } = req.body;
  try {
    await Game.updateMany(
      { name },
      { name: newName, gameStartTime, gameEndTime }
    );
    res.redirect("/admin/editGame");
  } catch (e) {
    console.log(e);
    res.render("editGame", { error: "internal server error" });
  }
});

app.get("*", async (req, res) => {
  res.render("notFound");
});

server.listen(process.env.PORT, () => {
  console.log(`server started at ${process.env.PORT}`);
});

cron.schedule("0 0 1 1 *", async () => {
  try {
    let currDate = new Date();
    let prevYear = currDate.getFullYear() - 1;
    let prevGames = await Game.find({ year: `${prevYear}` });
    for (let i = 0; i < prevGames.length; i++) {
      await Game.create({
        name: prevGames[i].name,
        time: prevGames[i].time,
        year: prevYear + 1,
        value: [
          {
            date: prevGames[i].value[prevGames[i].value.length - 1].date,
            number: prevGames[i].value[prevGames[i].value.length - 1].number,
          },
        ],
      });
    }
  } catch (e) {
    console.log(e);
  }
});

io.on("connection", (socket) => {
  console.log(`someone with ${socket.id} connected`);
  socket.on("admin-updated-value", (data) => {
    console.log("data", data);
    let { _csrf, ...rest } = data;
    io.emit("value-updated", rest);
  });
});
