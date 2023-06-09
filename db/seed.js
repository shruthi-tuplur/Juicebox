
const {
    client,
    getAllUsers, 
    createUser,
    updateUser,
    getAllPosts,
    getPostsByUser,
    createPost,
    updatePost,
    getUserById,
    addTagsToPost,
    createTags,
    getPostsByTagName
} = require('./index');

// this function should calll a query which drops all tables from our database 

async function dropTables(){
    try {

        console.log('Starting to drop tables…');

        await client.query(`
        DROP TABLE IF EXISTS post_tags;
        DROP TABLE IF EXISTS tags;
        DROP TABLE IF EXISTS posts;
        DROP TABLE IF EXISTS users;
        
        `);

        console.log('Finished dropping tables!');

    } catch (error){
        console.error('Error dropping tables!');
        throw error;
    }
}

// this function should call a query which creates all tables for our database
async function createTables() {
    try {

        console.log('starting to build tables…');

        await client.query(` 
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            username varchar (255) UNIQUE NOT NULL,
            password varchar (255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            location VARCHAR(255) NOT NULL,
            active BOOLEAN DEFAULT true
        );

        CREATE TABLE posts (
            id SERIAL PRIMARY KEY,
            "authorId" INTEGER REFERENCES users(id) NOT NULL,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            active BOOLEAN DEFAULT true
        );

        CREATE TABLE tags (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE
        );
        
        CREATE TABLE post_tags (
            "postId" INTEGER REFERENCES posts(id),
            "tagId" INTEGER REFERENCES tags(id), 
            unique("postId", "tagId")

        );
        
        `);
        

        console.log('Finished building tables!');
    } catch (error) {
        console.error('Error building tables…')
        throw error; // we pass the error up to the function that calls createTables
    }
}

async function createInitialUsers() {
    try {
        console.log('Starting to create users…');

        const albert = await createUser({username: 'albert', password: 'bertie99', name: 'Albert', location: 'Vermont'});
        const sandra = await createUser({ username: 'sandra', password: '2sandy4me', name: 'Sandra', location: 'San Jose' });
        const glamgal = await createUser({ username: 'glamgal', password: 'soglam', name: 'Albertina', location: 'Vermont' });

        console.log(albert);

        console.log('Finished creating users!');
    } catch (error){
        console.error('Error creating users!');
        throw error;
    }
}


async function createInitialPosts() {
    try {
      const [albert, sandra, glamgal] = await getAllUsers();
  
      await createPost({
        authorId: albert.id,
        title: "First Post",
        content: "This is my first post. I hope I love writing blogs as much as I love writing them.",
        tags: ["#happy", "#youcandoanything"]
      });

      await createPost({
        authorId: sandra.id,
        title: "Second Post",
        content: "This is my second post.",
        tags: ["#happy", "#worst-day-ever"]
      });

      await createPost({
        authorId: glamgal.id,
        title: "Third Post",
        content: "This is my third post. ",
        tags: ["#happy", "#youcandoanything", "#canmandoeverything"]
      });

    
  
      // a couple more
    } catch (error) {
      throw error;
    }
  }


async function rebuildDB() {

    console.log('NEW TEST --------------------------------------------------------------------')
    try {
        client.connect();

        await dropTables();
        await createTables();
        await createInitialUsers();
        await createInitialPosts();
    } catch (error) {
        console.error(error);
    } 
}



async function testDB(){
    try {
        console.log("Starting to test database...");

        /*
        console.log("Calling getAllUsers");
        const users = await getAllUsers();
        
    
        console.log("Calling updateUser on users[0]");
        const updateUserResult = await updateUser(users[0].id, {
          name: "Newname Sogood",
          location: "Lesterville, KY"
        });
        
        
    
        console.log('Getting all posts…');
        */
        const posts = await getAllPosts();
        
        
        console.log("Calling updatePost on posts[1], only updating tags");
        const updatePostResult = await updatePost(posts[1].id, {
            tags: ["#youcandoanything", "#redfish", "#bluefish"]
        });
        console.log('result: ', updatePostResult)

        /*
    
        console.log("Calling getUserById with 1");
        const albert = await getUserById(1);
        console.log("Result:", albert);

        */
        console.log('all posts: ', posts);
    
        console.log("Calling getPostsByTagName with #happy");
        const postsWithHappy = await getPostsByTagName("#happy");
        console.log("Result:", postsWithHappy);

        console.log("Finished database tests!");

    } catch (error) {
        console.error('Error testing database!');
        throw error;
    }


}




rebuildDB()
    .then(testDB)
    .catch(console.error)
    .finally(() => client.end());