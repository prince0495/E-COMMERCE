const { Product } = require("../model/Product");

exports.createProduct = async (req, res) => {
    // Product will come from API body

    const product = new Product(req.body)
    product.discountPrice = Math.round(product.price*(1-product.discountPercentage/100))
    try {
        const doc = await product.save()
        console.log("product is saved");
        res.status(200).json(doc)
    } catch (err) {
        res.status(400).json(err)
    }
}
exports.fetchAllProducts = async (req, res) => {
    // Here we need all query string

    // filter = {"category":["smartphone", "laptops"]}
    // sort = {_sort: "price"}
    // pagination = {_page: 1, _limit: 10}

    console.log(req.query);
    let condition = {}
    if(!req.query.admin) {
        condition.deleted = {$ne: true}
    }
    let query = Product.find(condition)
    let totalProductsQuery = Product.find(condition)

    if(req.query.category) {
        query = query.find({category: {$in: req.query.category.split(',')}})
        totalProductsQuery = totalProductsQuery.find({category: {$in: req.query.category.split(',')}})
    }
    if(req.query.brand) {
        query = query.find({brand: {$in: req.query.brand.split(',')}})
        totalProductsQuery = totalProductsQuery.find({brand: {$in: req.query.brand.split(',')}})
    }
    if(req.query._sort) {
        // query = query.sort({[req.query._sort]: req.query._sort});
        query = query.sort(`${req.query._sort}`)
        totalProductsQuery = totalProductsQuery.sort(`${req.query._sort}`)
    }

    const totalDocs = await totalProductsQuery.count().exec();
    // console.log({totalDocs});

    if(req.query._page && req.query._per_page) {
        const pageSize = req.query._per_page;
        const page = req.query._page;
        query = query.skip(pageSize*(page-1)).limit(pageSize)
    } 

    
    try {
        const docs = await query.exec()
        res.set('X-Total-Count', totalDocs)
        res.status(200).json(docs)
    } catch (err) {
        res.status(400).json(err)
    }
}
exports.fetchProductById = async (req, res) => {
    const { id } = req.params;
    try {
        const product = await Product.findById(id)
        res.status(200).json(product)
    } catch (error) {
        res.status(400).json(error)
    } 
}
exports.updateProduct = async (req,res) => {
    const {id} = req.params;
    try {
        const product = await Product.findByIdAndUpdate(id, req.body, {new: true});
        product.discountPrice = Math.round(product.price*(1-product.discountPercentage/100))
        const updatedProduct = await product.save()
        res.status(200).json(updatedProduct)
    } catch (error) {
        res.status(400).json(error)
    }
}