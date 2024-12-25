import Joi from "joi";

export const validateUserInput = (data) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(30).required().messages({
      "string.empty": "User name is required.",
      "string.min": "User name must be at least 3 characters.",
      "string.max": "User name must not exceed 30 characters.",
      "any.required": "User name is required.",
    }),
    email: Joi.string().email().required().messages({
      "string.empty": "Email is required.",
      "string.email": "Please provide a valid email address.",
      "any.required": "Email is required.",
    }),
    password: Joi.string().min(8).required().messages({
      "string.empty": "Password is required.",
      "string.min": "Password must be at least 8 characters long.",
      "any.required": "Password is required.",
    }),
  });
  return schema.validate(data, { abortEarly: false });
};

const validCategories = [
  "Groceries",
  "Leisure",
  "Electronics",
  "Utilities",
  "Clothing",
  "Health",
  "Others",
];

export const expenseValidationSchema = Joi.object({
  title: Joi.string().max(255).required().messages({
    "string.base": "Title must be a string.",
    "string.empty": "Title cannot be empty.",
    "string.max": "Title must not exceed 255 characters.",
    "any.required": "Title is required.",
  }),

  description: Joi.string().required().messages({
    "string.base": "Description must be a string.",
    "string.empty": "Description cannot be empty.",
    "any.required": "Description is required.",
  }),

  category: Joi.string()
    .valid(...validCategories)
    .required()
    .messages({
      "any.only": `Category must be one of ${validCategories.join(", ")}.`,
      "any.required": "Category is required.",
    }),

  amount: Joi.number().precision(2).positive().required().messages({
    "number.base": "Amount must be a number.",
    "number.positive": "Amount must be greater than zero.",
    "number.precision": "Amount must have at most 2 decimal places.",
    "any.required": "Amount is required.",
  }),
});

export const budgetSchema = Joi.object({
  category: Joi.string()
    .valid(...validCategories)
    .required()
    .messages({
      "any.only": `Category must be one of ${validCategories.join(", ")}`,
      "any.required": "Category is required.",
    }),

  amount: Joi.number().precision(2).positive().required().messages({
    "number.base": "Amount must be a number.",
    "number.positive": "Amount must be greater than zero.",
    "number.precision": "Amount must have at most 2 decimal places.",
    "any.required": "Amount is required.",
  }),
});
