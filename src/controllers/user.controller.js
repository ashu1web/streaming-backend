import {asyncHandler} from "../utils/asyncHandler.js"

const registerUser=asyncHandler(async(req,res)=>{
    return res.status(200).json({
        message:"ok"
    })
})


export {registerUser}










/*  to undertand wrapper fn
function withGreeting(fn) {
    return function() {
        console.log("Welcome to the program!");  // Add greeting
        fn();  // Call the original function
    };
}

function sayHello() {
    console.log("Hello!");
}

// Wrap the sayHello function with a greeting
const sayHelloWithGreeting = withGreeting(sayHello);

// Call the wrapped function
sayHelloWithGreeting();  // Output: Welcome to the program!
                         //         Hello!

*/