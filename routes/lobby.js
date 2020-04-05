"use strict";
const express = require('express');
let router = express.Router();

router.route('/:gameCode').get((req, res) => {
    //var gameCode = req.params.gameCode;
    //res.status(200).send(String(gameCode)).toString();

});

module.exports = router;