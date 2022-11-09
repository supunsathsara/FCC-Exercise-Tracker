const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.use(express.static('public'));
const Schema = mongoose.Schema;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
});

const logSchema = new Schema({
  userId: String,
  description: String,
  duration: Number,
  date: Date,
});

const User = mongoose.model('User', userSchema);
const Log = mongoose.model('Log', logSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', (req, res) => {
  const username = req.body.username;
  if (username == '') {
    res.send('Please enter a username');
  } else {
    const newUser = new User({ username: username });
    newUser.save((err, data) => {
      if (err) {
        if (err.name === 'MongoServerError' && err.code === 11000) {
          res.json({ error: 'Username already taken' });
        } else {
          res.json({ error: 'Unable to create user' });
        }
      } else {
        res.json({ username: data.username, _id: data._id });
      }
    });
  }
});

app.get('/api/users', (req, res) => {
  User.find({}, { __v: 0 }, (err, data) => {
    if (err) {
      res.json({ error: 'Unable to retrieve users' });
    } else {
      res.json(data);
    }
  });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const userId = req.params._id;
  const description = req.body.description;
  const duration = req.body.duration;
  if (!req.body.date) {
    date = new Date();
  } else {
    date = new Date(req.body.date);
  }
  if (description == '' || duration == '') {
    res.send('Please enter a description and duration');
  } else {
    User.findById(userId, (err, userData) => {
      if (err) {
        res.json({ error: 'Unable to find user' });
      } else {
        const newLog = new Log({
          userId: userId,
          description: description,
          duration: duration,
          date: date,
        });
        newLog.save((err, data) => {
          if (err) {
            console.log(err);
            res.json({ error: 'Unable to create log' });
          } else {
            res.json({
              username: userData.username,
              description: data.description,
              duration: data.duration,
              _id: data.userId,
              date: data.date.toDateString(),
            });
          }
        });
      }
    });
  }
});

app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const from = req.query.from;
  const to = req.query.to;
  const limit = req.query.limit;
  User.findById(userId, (err, userData) => {
    if (err) {
      res.json({ error: 'Unable to find user' });
    } else {
      Log.find(
        { userId: userId },
        {
          _id: 0,
          __v: 0,
        },
        (err, data) => {
          if (err) {
            res.json({ error: 'Unable to find logs' });
          } else {
            if (from) {
              data = data.filter((log) => log.date >= new Date(from));
            }
            if (to) {
              data = data.filter((log) => log.date <= new Date(to));
            }
            if (limit) {
              data = data.slice(0, limit);
            }

            let logArr = [];
            for (let i = 0; i < data.length; i++) {
              logArr.push({
                description: data[i].description,
                duration: data[i].duration,
                date: new Date(data[i].date).toDateString().slice(0, 16),
              });
            }
            if (from && to) {
              res.json({
                _id: userData._id,
                username: userData.username,
                from: new Date(from).toDateString(),
                to: new Date(to).toDateString(),
                count: data.length,
                log: logArr,
              });
            } else if (from) {
              res.json({
                _id: userData._id,
                username: userData.username,
                from: new Date(from).toDateString(),
                count: data.length,
                log: logArr,
              });
            } else if (to) {
              res.json({
                _id: userData._id,
                username: userData.username,
                to: new Date(to).toDateString(),
                count: data.length,
                log: logArr,
              });
            } else {
              res.json({
                _id: userId,
                username: userData.username,
                count: data.length,
                log: [...logArr],
              });
            }
          }
        }
      );
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
