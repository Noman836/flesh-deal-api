const Joi = require('joi');

const validateOrderCreation = (req, res, next) => {
  const addressSchema = Joi.object({
    street: Joi.string().required().messages({
      'any.required': 'Street address is required'
    }),
    city: Joi.string().required().messages({
      'any.required': 'City is required'
    }),
    state: Joi.string().required().messages({
      'any.required': 'State is required'
    }),
    zipCode: Joi.string().required().messages({
      'any.required': 'Zip code is required'
    }),
    country: Joi.string().required().messages({
      'any.required': 'Country is required'
    })
  });

  const schema = Joi.object({
    reservationId: Joi.string().optional(),
    batchReservationId: Joi.string().optional(),
    shippingAddress: addressSchema.required().messages({
      'any.required': 'Shipping address is required'
    }),
    billingAddress: addressSchema.optional(),
    notes: Joi.string().max(500).optional()
  }).xor('reservationId', 'batchReservationId').messages({
    'object.xor': 'Either reservationId or batchReservationId must be provided, not both'
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

const validateOrderStatusUpdate = (req, res, next) => {
  const schema = Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled').required().messages({
      'any.only': 'Invalid order status',
      'any.required': 'Order status is required'
    }),
    paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').optional()
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
  validateOrderCreation,
  validateOrderStatusUpdate
};
