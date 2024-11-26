import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app=express()

app.use(cors({ 
    origin:process.env.CORS_ORIGIN,                       //origin from where my backend can take request
    credentials:true,
}))

app.use(express.json({limit:"16kb"}))                     //limit of json data
app.use(express.urlencoded({extended:true,limit:"16kb"})) //url data
app.use(express.static("public"))                         //to store public data like image
app.use(cookieParser())                                   //Req,res have cookie access,My server can change user's broswer cookie through cookie parser

//routes import 
import userRouter from './routes/user.routes.js'
import tweetRouter from "./routes/tweet.routes.js"

//routes declaration
app.use("/api/v1/users",userRouter)
app.use("/api/v1/tweets", tweetRouter)

export  {app}


//app is an object of expres and its app.use() is used for configuration and middleware