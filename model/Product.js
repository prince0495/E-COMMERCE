const mongoose = require('mongoose');
const {Schema} = mongoose;

const productSchema = new Schema({
    title: {type: String, required: true, unique: true},
    description: {type: String, required: true},
    price: {type: Number, min:[0, 'Price can\'t be negative'], max: [1000000,'Maximum Price is 1000000']},
    discountPercentage : {type: Number, min:[0, 'Discount can\'t be negative'], max: [99,'Maximum Discount is 99']},
    rating: {type: Number, min:[0, 'Rating can\t be less than zero'], max: [5,'Maximum Rating is 5'] , default :0},
    stock: {type: Number, min:[0, 'Stock can\t be less than zero'], default: 0},
    brand: {type : String , required: [true, 'Brand is mandatory']},
    category:{type: String, required:[true,'Category is mandatory']},
    thumbnail: {type: String, required: [true, 'Thumbnail URL is mandatory']},
    images: {type: [String], required: true},
    colors: {type: [Schema.Types.Mixed]},
    sizes: {type: [Schema.Types.Mixed]},
    highlights: {type: [String]},
    discountPrice: {type: Number},
    deleted: {type: Boolean, default : false}
})

const virtual = productSchema.virtual('id');
virtual.get(function() {
    return this._id;
})
productSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {delete ret._id}
})

exports.Product = mongoose.model('Product', productSchema)