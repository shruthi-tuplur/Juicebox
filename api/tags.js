const express = require('express');
const tagsRouter = express.Router();

const {getAllTags, getPostsByTagName} = require('../db');


tagsRouter.use((req, res, next) => {
    console.log('a request is being made to /tags');
    next();
})

tagsRouter.get('/', async(req, res) => {

    const tags = await getAllTags();

    res.send({
        tags
    })

})

tagsRouter.get('/:tagName/posts', async (req, res, next) => {
    const tagName = req.params.tagName;

    try {
        const posts = await getPostsByTagName(tagName);
        res.send({'posts': posts})
    } catch ({name, message}){
        next({name, message})
    }
})

module.exports = tagsRouter;