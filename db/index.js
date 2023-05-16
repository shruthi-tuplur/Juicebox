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
    const {rows} = await client.query(
        `SELECT id, "authorId", title, content, active
        FROM posts;
        `
    )
    
    
    return rows;
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

async function createPost({authorId, title, content}) {
    try {
        const {rows} = await client.query(`
        INSERT INTO posts("authorId", title, content) 
        VALUES ($1, $2, $3)
        RETURNING *;
        
        `, [authorId, title, content])

        return rows;
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

  async function updatePost(id, fields = {}){
    
    const setString = Object.keys(fields).map(
        (key, index) => `"${ key }"=$${ index + 1 }`
      ).join(', ');
    
      // return early if this is called without fields
      if (setString.length === 0) {
        return;
      }
  
      console.log('Object.values(fields).length: ', Object.values(fields).length )
      
    
      try {
        const {rows: [ posts ]} = await client.query(`
          UPDATE posts
          SET ${ setString }
          WHERE id=$${Object.values(fields).length + 1}
          RETURNING *;
        `, [...Object.values(fields), id]);
        
        console.log('posts: ', posts);
        return posts;

    } catch (error) {
        throw error;
    }
}

async function getPostsByUser(userId) {
    try {
      const { rows } = await client.query(`
        SELECT * FROM posts
        WHERE "authorId"=$1;
      `, [userId]);
  
      return rows;
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



module.exports = {
    client,
    getAllUsers,
    createUser,
    updateUser,
    createPost,
    updatePost,
    getAllPosts,
    getPostsByUser,
    getUserById
}