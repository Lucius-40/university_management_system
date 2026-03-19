const express = require("express");
const SystemStateController = require("../controllers/systemStateController.js");
const AuthenticateToken = require("../middlewares/authenticateToken.js");

const router = express.Router();
const controller = new SystemStateController();
const auth = new AuthenticateToken();

router.get("/", auth.authenticateToken, controller.getState);
router.put("/", auth.authenticateToken, controller.updateState);

module.exports = router;
