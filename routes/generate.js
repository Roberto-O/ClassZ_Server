"use strict";
const express = require('express');
let router = express.Router();

router.route('/').get((req, res) => {
    var gameCode = req.game_code;
    res.status(200).send(String(gameCode)).toString();
});

module.exports = router;