/*

convert plain password to secure encrypted hash

*/


const bcrypt = require('bcryptjs');     //bycryptjs is a library for hashing passwords

async function main() {
    const hash = await bcrypt.hash('password123', 10);  //hash with a salt round of 10 (the higher the rounds, the more secure but also more time-consuming)
    console.log('Use this hash in your SQL:');
    console.log(hash);
}

main();