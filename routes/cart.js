// Express promise router
const Router = require("express-promise-router");
// HttpError
const HttpError = require("../utils/HttpError");
// Joi
const Joi = require("joi");
// DB (Knex)
const {
  createNewCart,
  addItemsToCart,
  validateCartIdByUserId,
  getCartItemsByCartId,
  updateCartItemQuantity,
  deleteCartItemByCartIdAndProductId,
  checkoutCart,
} = require("../db/db-cart");
const { getUserAddressesByUserId } = require("../db/db-users");

const cartRouter = new Router();

// Creates a new cart
cartRouter.post("/", checkUserAuthorization, async (req, res, next) => {
  // Query: Create a new cart
  const result = await createNewCart(req.user.user_id);

  // Return the newly created cart
  res.status(201).json(result);
});

// Gets a specific cart
cartRouter.get(
  "/:cartId",
  checkUserAuthorization,
  validateCartIdInput,
  async (req, res, next) => {
    // Query: Get the cart details
    const result = await getCartItemsByCartId(req.validatedCartId.cart_id);

    // Return the cart
    res.status(200).json(result);
  }
);

// Adds an item/multiple items to a specific cart
cartRouter.post(
  "/:cartId",
  checkUserAuthorization,
  validateCartIdInput,
  async (req, res, next) => {
    // Specify joi schema for a single item
    const itemSchema = Joi.object(
      {
        product_id: Joi.string().uuid().required(),
        quantity: Joi.number().integer().min(1).required(),
      },
      { stripUnknown: true }
    );
    // Specify joi schema for inputting all items
    const itemsSchema = Joi.object(
      {
        items: Joi.array().items(itemSchema).min(1).required(),
      },
      { stripUnknown: true }
    );

    // Validate the input
    const { value, error } = itemsSchema.validate(req.body);

    // Throw an error if there's an error
    if (error) {
      throw new HttpError("Invalid input data", 400);
    }

    // Query: Add items to the cart
    const result = await addItemsToCart(
      req.validatedCartId.cart_id,
      value.items
    );

    // Return the updated cart
    res.status(201).json(result);
  }
);

// Updates the quantity of an item in a specific cart
cartRouter.put(
  "/:cartId/:productId",
  checkUserAuthorization,
  validateCartIdInput,
  async (req, res, next) => {
    // Specify joi schema
    const schema = Joi.object({
      product_id: Joi.string().uuid().required(),
      quantity: Joi.number().integer().min(1).required(),
    });

    // Validate the input
    const { value, error } = schema.validate(
      {
        product_id: req.params.productId,
        quantity: req.body.quantity,
      },
      { stripUnknown: true }
    );

    // Throw an error if there's an error
    if (error) {
      throw new HttpError("Invalid input data", 400);
    }

    // Query: Add items to the cart
    const result = await updateCartItemQuantity(
      req.validatedCartId.cart_id,
      value.product_id,
      value.quantity
    );

    // Return the updated cart
    res.status(200).json(result);
  }
);

// Deletes an item from a specific cart
cartRouter.delete(
  "/:cartId/:productId",
  checkUserAuthorization,
  validateCartIdInput,
  async (req, res, next) => {
    // Specify joi schema
    const schema = Joi.object({
      product_id: Joi.string().uuid().required(),
    });

    // Validate the input
    const { value, error } = schema.validate(
      {
        product_id: req.params.productId,
      },
      { stripUnknown: true }
    );

    // Throw an error if there's an error
    if (error) {
      throw new HttpError("Invalid input data", 400);
    }

    // Query: Delete an item from the cart
    await deleteCartItemByCartIdAndProductId(
      req.validatedCartId.cart_id,
      value.product_id
    );

    // Return that the item was deleted
    res.status(200).json({ success: true, message: "Item deleted from cart" });
  }
);

// Checks out a specific cart
cartRouter.post(
  "/:cartId/checkout",
  checkUserAuthorization,
  validateCartIdInput,
  validateAddressIdInput,
  async (req, res, next) => {
    // Query: Checkout the cart
    const result = await checkoutCart(
      req.validatedCartId.cart_id,
      req.user.user_id,
      req.validatedAddressId
    );

    // Return the response
    res.status(200).json(result);
  }
);

// Checks if the user is a customer or an admin
function checkUserAuthorization(req, res, next) {
  // Get the role_id from the JWT
  const { role_name } = req.user;

  // Throw an error if the user is not a customer
  if (role_name !== "Customer") {
    throw new HttpError("Unauthorized", 401);
  }

  // Move to the next middleware
  next();
}

// Validates the input for cart ID
function validateCartIdInput(req, res, next) {
  // Specify joi schema
  const schema = Joi.object(
    {
      cart_id: Joi.string().uuid().required(),
    },
    { stripUnknown: true }
  );

  // Validate the input
  const { value, error } = schema.validate({
    cart_id: req.params.cartId,
  });

  // Throw an error if there's an error
  if (error) {
    throw new HttpError("Invalid input data", 400);
  }

  // Query: Validate the cart ID
  const isValid = validateCartIdByUserId(value.cart_id, req.user.user_id);

  // Throw an error if the cart ID is invalid
  if (!isValid) {
    throw new HttpError("Unauthorized", 401);
  }

  // Save the validated cart ID in the request
  req.validatedCartId = value;

  // Move to the next middleware
  next();
}

// Validates the input for address ID
async function validateAddressIdInput(req, res, next) {
  // Specify joi schema
  const schema = Joi.object({
    address_id: Joi.string().uuid().required(),
  });

  // Validate the input
  const { value, error } = schema.validate(
    {
      address_id: req.body.address_id,
    },
    { stripUnknown: true }
  );

  // Throw an error if there's an error
  if (error) {
    throw new HttpError("Invalid input data", 400);
  }

  // Query: Get the user's addresses
  const addresses = await getUserAddressesByUserId(req.user.user_id);

  // Throw an error if the address ID is invalid
  const isValid = addresses.find(
    (address) => address.address_id === value.address_id
  );
  if (!isValid) {
    throw new HttpError("Invalid address ID", 400);
  }

  // Save the validated address in the request
  req.validatedAddressId = value.address_id;

  // Move to the next middleware
  next();
}

module.exports = cartRouter;
