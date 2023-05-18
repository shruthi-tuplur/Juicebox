const {Client} = require('pg');
const client = new Client('postgres://localhost:5432/juicebox-dev');

module.exports = {
    client, 
}

async function getAllUsers() {
    const { rows } = await client.query(
        `SELECT id, username, name, location, active
        FROM users;
        `
    );

    return rows;
}

async function getAllPosts() {
    const {rows: postIds} = await client.query(
        `SELECT id, "authorId", title, content, active
        FROM posts;
        `
    )

    const posts = await Promise.all(postIds.map(
        post => getPostById(post.id)
            
        
    ))
    
    //console.log('here are my posts: ', posts)
    return posts;
}

async function createUser({username, password, name, location}) {
    try {
        const { rows } = await client.query(`
        INSERT INTO users(username, password, name, location) 
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (username) DO NOTHING
        RETURNING *;
        `, [username, password, name, location]);

        return rows
    } catch (error) {
        throw error;
    }
}

async function createPost({authorId, title, content, tags = []}) {
    try {
        const {rows: [post]} = await client.query(`
        INSERT INTO posts("authorId", title, content) 
        VALUES ($1, $2, $3)
        RETURNING *;
        
        `, [authorId, title, content])

        const tagList = await createTags(tags);

        console.log('taglist: ', tagList);

        return await addTagsToPost(post.id, tagList);
    } catch (error) {
        throw error;
    }

}



async function updateUser(id, fields = {}) {
    // build the set string
    const setString = Object.keys(fields).map(
      (key, index) => `"${ key }"=$${ index + 1 }`
    ).join(', ');
  
    // return early if this is called without fields
    if (setString.length === 0) {
      return;
    }

    console.log('Object.values(fields).length: ', Object.values(fields).length )
    
  
    try {
      const {rows: [ user ]} = await client.query(`
        UPDATE users
        SET ${ setString }
        WHERE id=$${Object.values(fields).length + 1}
        RETURNING *;
      `, [...Object.values(fields), id]);
  
      return user;
    } catch (error) {
      throw error;
    }
  }

  async function updatePost(postId, fields = {}){
    
    const {tags} = fields; 

    delete fields.tags

    const setString = Object.keys(fields).map(
        (key, index) => `"${ key }"=$${ index + 1 }`
    ).join(', ');

    try{

        if (setString.length > 0){
            await client.query(`
            UPDATE posts
            SET ${ setString }
            WHERE id=$${Object.values(fields).length + 1}
            RETURNING *;
            
            `,  [...Object.values(fields), postId])
        }

        if (tags === undefined) {
            return await getPostById(postId);
        }

        const tagList = await createTags(tags);
        const tagListIdString = tagList.map(
          tag => `${ tag.id }`
        ).join(', ');

        await client.query(`
        DELETE FROM post_tags
        WHERE "tagId"
        NOT IN (${ tagListIdString })
        AND "postId"=$1;
      `, [postId]);

        await addTagsToPost(postId, tagList);

        return await getPostById(postId);
    

    } catch (error) {
        throw error;
    }
}

async function getPostsByUser(userId) {
    try {
      const { rows: postIds } = await client.query(`
        SELECT * FROM posts
        WHERE "authorId"=$1;
      `, [userId]);
  
     
      const posts = await Promise.all(postIds.map(
        post => getPostById(post.id)
      ));

    return posts;

    } catch (error) {
      throw error;
    }
  }

  async function getUserById(userID) {
    try {
        const { rows } = await client.query(`
        SELECT * FROM users 
        WHERE id=$1;
        `, [userID])

        if(!rows.length){
            return null
        } else {
            delete rows[0].password;
            const userPosts = await getPostsByUser(userID);
            rows[0].posts = userPosts;
            return rows[0];
        }
    } catch(error) {
        throw error;
    }
  }

  async function createTags(tagList) {
    
    if (tagList.length === 0){
        return // because this means we don't have any tags to insert into the tags table
    }

    // need something like: $1), ($2), ($3 ; this is telling sql which individual tags need to be inserted into the table
    const insertValues = tagList.map((_, index) => `$${index + 1}`).join('), (');
    // then we can use: (${ insertValues }) in our string template

    // need something like $1, $2, $3
    const selectValues = tagList.map((_, index) => `$${index + 1}`).join(', ');
    // then we can use (${ selectValues }) in our string template


    try {
    
        
        await client.query(`
            INSERT INTO tags(name)
            VALUES (${insertValues})
            ON CONFLICT (name) DO NOTHING;
            

        `, tagList)
        

        
        const {rows} = await client.query(`
            SELECT * FROM tags
            WHERE name
            IN (${selectValues});
        
        `, tagList)

        

        
        return rows;
    
    } catch (error){
        throw error;
    }
    }

    async function createPostTag(postId, tagId) {
        try {

            /* 
            telling sql that we want to insert something into the post_tags table into the postId and tagId sections
            the values in the 1st and 2nd spots in the array provided as the 2nd argument to the query
            if the postId and tagId are already in the sections then we do not do anything 
            */
            
            await client.query(`
            INSERT INTO post_tags("postId", "tagId") 
            VALUES ($1, $2)
            ON CONFLICT ("postId", "tagId") DO NOTHING;
            `, [postId, tagId])
            

        } catch (error) {
            throw error;
        }
    }

    async function addTagsToPost(postId, tagList){
        
        console.log('taglist: ', tagList);
        try {

            // creating a list of promises where for each tag in the tag list, that relationship between tag and the post it's attached to will be recorded in the post_tags table
            
            const createPostTagPromises = tagList.map(
                tag => {
                    createPostTag(postId, tag.id)
                }
            );


            await Promise.all(createPostTagPromises)
            
            return await getPostById(postId);


        } catch (error) {
            throw error
        }

    }

    async function getPostById(postId){
        try {

           
            
            const {rows: [post]} = await client.query(`
            SELECT * 
            FROM posts
            WHERE id=$1;
            `, [postId]);

            
            const {rows: tags} = await client.query(`
            SELECT tags.*
            FROM tags
            JOIN post_tags on tags.id=post_tags."tagId"
            WHERE post_tags."postId"=$1;
            `, [postId])

            
            const {rows: [author]} = await client.query(`
            SELECT id, username, name, location
            FROM users
            WHERE id=$1;
            `, [post.authorId])

            post.tags = tags;

            
            post.author = author;

            delete post.authorId;

            return post;

        } catch (error){
            throw error
        }


    }

    async function getPostsByTagName(tagName){
        try {
            const { rows: postIds} = await client.query(`
            
            SELECT posts.id
            FROM posts
            JOIN post_tags ON posts.id = post_tags."postId"
            JOIN tags ON tags.id=post_tags."tagId"
            WHERE tags.name=$1;
            
            `, [tagName]);

            return await Promise.all(postIds.map(
                post => getPostById(post.id)
            ));

        } catch (error) {
            throw error;
        }

    }

module.exports = {
    client,
    getAllUsers,
    createUser,
    updateUser,
    createPost,
    updatePost,
    getAllPosts,
    getPostsByUser,
    getUserById,
    createTags,
    addTagsToPost,
    getPostsByTagName
}