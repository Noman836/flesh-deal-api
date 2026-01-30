const Joi = require('joi');

const validateProductCreation = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(200).required().messages({
      'string.min': 'Product name is required',
      'string.max': 'Product name must not exceed 200 characters',
      'any.required': 'Product name is required'
    }),
    description: Joi.string().min(1).max(1000).required().messages({
      'string.min': 'Product description is required',
      'string.max': 'Product description must not exceed 1000 characters',
      'any.required': 'Product description is required'
    }),
    sku: Joi.string().required().messages({
      'any.required': 'Product SKU is required'
    }),
    price: Joi.number().min(0).required().messages({
      'number.min': 'Price must be a positive number',
      'any.required': 'Price is required'
    }),
    totalStock: Joi.number().integer().min(0).required().messages({
      'number.min': 'Total stock must be a positive integer',
      'any.required': 'Total stock is required'
    }),
    category: Joi.string().required().messages({
      'any.required': 'Product category is required'
    }),
    flashDealSettings: Joi.object({
      startTime: Joi.date().required().messages({
        'any.required': 'Flash deal start time is required'
      }),
      endTime: Joi.date().greater(Joi.ref('startTime')).required().messages({
        'date.greater': 'End time must be after start time',
        'any.required': 'Flash deal end time is required'
      }),
      maxReservationTime: Joi.number().integer().min(60).default(600).optional()
    }).required(),
    images: Joi.array().items(Joi.string()).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  next();
};

const validateProductUpdate = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    description: Joi.string().min(1).max(1000).optional(),
    sku: Joi.string().optional(),
    price: Joi.number().min(0).optional(),
    totalStock: Joi.number().integer().min(0).optional(),
    category: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
    flashDealSettings: Joi.object({
      startTime: Joi.date().optional(),
      endTime: Joi.date().optional(),
      maxReservationTime: Joi.number().integer().min(60).optional()
    }).optional(),
    images: Joi.array().items(Joi.string()).optional()
  }).min(1);

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  next();
};

const validateReservation = (req, res, next) => {
  const schema = Joi.object({
    productId: Joi.string().required().messages({
      'any.required': 'Product ID is required'
    }),
    quantity: Joi.number().integer().min(1).required().messages({
      'number.min': 'Quantity must be at least 1',
      'any.required': 'Quantity is required'
    })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  next();
};

const validateBatchReservation = (req, res, next) => {
  const itemSchema = Joi.object({
    productId: Joi.string().required().messages({
      'any.required': 'Product ID is required'
    }),
    quantity: Joi.number().integer().min(1).required().messages({
      'number.min': 'Quantity must be at least 1',
      'any.required': 'Quantity is required'
    })
  });

  const schema = Joi.object({
    items: Joi.array().items(itemSchema).min(1).max(10).required().messages({
      'array.min': 'At least one item is required',
      'array.max': 'Maximum 10 items allowed per batch reservation',
      'any.required': 'Items array is required'
    })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  next();
};

module.exports = {
  validateProductCreation,
  validateProductUpdate,
  validateReservation,
  validateBatchReservation
};
