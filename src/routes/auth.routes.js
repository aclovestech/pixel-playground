// Express promise router
const Router = require("express-promise-router");
// Passport-related
const passport = require("../config/passport-config");
// Auth-related
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");

const authRouter = new Router();

// Registers a new customer
authRouter.post(
  "/register",
  authMiddleware.validateRegistrationInput,
  authController.createUser
);

// Authenticates the user and gives back a JWT
authRouter.post(
  "/login",
  // Authenticate the user
  passport.authenticate("local", { session: false }),
  authController.loginUser
);

module.exports = authRouter;