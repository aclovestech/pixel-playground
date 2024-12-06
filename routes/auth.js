// Express promise router
const Router = require("express-promise-router");
// Passport-related
const passport = require("../utils/passport-config");
// JWT-related
const jwt = require("../utils/jwt");
// HttpError
const HttpError = require("../utils/HttpError");
// Joi
const Joi = require("joi");
// DB (Knex)
const { insertUser } = require("../db/db-auth");
// Bcrypt
const { hashPassword } = require("../utils/bcrypt");

const authRouter = new Router();

// Registers a new customer
authRouter.post(
  "/register",
  validateRegistrationInput,
  async (req, res, next) => {
    // Query: Create a new row for the user (transaction)
    const result = await insertUser(req.validatedInput);

    // Return the newly created user info
    res.status(201).json(result);
  }
);

// Authenticates the user and gives back a JWT
authRouter.post(
  "/login",
  // Authenticate the user
  passport.authenticate("local", { session: false }),
  (req, res, next) => {
    // Return the token if the user is authenticated
    const token = jwt.generateAccessToken(req.user);

    // Return the token
    res.status(201).json({ token });
  }
);

// Validates the input for registration
async function validateRegistrationInput(req, res, next) {
  // Convert role to lowercase if it exists
  req.body.role = req.body.role?.toLowerCase();

  // Throw an error if the role given is admin
  if (req.body.role === "admin") {
    throw new HttpError("Unauthorized", 400);
  }

  // Specify joi schema
  const schema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    role: Joi.string().default("customer").valid("customer", "seller"),
  });

  // Validate the input
  const { value, error } = schema.validate(req.body, {
    stripUnknown: true,
  });

  // Throw an error if there's an error
  if (error) {
    throw new HttpError("Missing required data", 400);
  }

  // Save the validated input in the request
  req.validatedInput = value;

  // Set the role_id based on the role_name
  if (req.validatedInput.role === "seller") {
    req.validatedInput.role_id = 2;
  } else if (req.validatedInput.role === "customer") {
    req.validatedInput.role_id = 3;
  }

  // Hash the given password and save it within the validated input
  req.validatedInput.password_hash = await hashPassword(value.password);

  // Move to the next middleware
  next();
}

module.exports = authRouter;
