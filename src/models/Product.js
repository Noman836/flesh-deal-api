const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  totalStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  availableStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  reservedStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  soldStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  flashDealSettings: {
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    maxReservationTime: {
      type: Number,
      default: 7200 
    }
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  images: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

productSchema.virtual('stockStatus').get(function() {
  if (this.availableStock === 0) {
    return 'OUT_OF_STOCK';
  } else if (this.availableStock < this.totalStock * 0.1) {
    return 'LOW_STOCK';
  }
  return 'AVAILABLE';
});

productSchema.virtual('reservationPercentage').get(function() {
  if (this.totalStock === 0) return 0;
  return ((this.reservedStock / this.totalStock) * 100).toFixed(2);
});


productSchema.pre('save', function(next) {
  if (this.isModified('totalStock')) {
    this.availableStock = this.totalStock - this.reservedStock - this.soldStock;
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
