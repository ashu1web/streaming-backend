const asyncHandler=(requestHandler)=>{
    return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err))
    }
}

export {asyncHandler}


/*
// Higher-order function
const greet = (name, styleFunction) => {
    return styleFunction(name);
};

// Style functions
const casualGreeting = (name) => `Hey, ${name}!`;
const formalGreeting = (name) => `Good evening, Mr./Ms. ${name}.`;

// Usage
console.log(greet("Alice", casualGreeting)); // Hey, Alice!
console.log(greet("Bob", formalGreeting));   // Good evening, Mr./Ms. Bob.


function asyncHandler(requestHandler) {
  return function (req, res, next) {
    Promise.resolve(requestHandler(req, res, next)).catch(function (err) {
      next(err);
    });
  };
}

export { asyncHandler };

*/
//const asyncHandler=I()=>{}
//const asyncHandler=(func)=>{()=>{}}
//const asyncHandler=(func)=>async()=>{}

/*
const asyncHandler=(fn)=>async(req,res,next)=>{
  try{
       return await fn(req,res,next)
  }catch(err){
     res.status(err.code || 500).json({
        success:false, 
        message:err.message
     })
  }
}
*/