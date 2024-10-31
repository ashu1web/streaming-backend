import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app=express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true,
}))

app.use(express.json({limit:"16kb"}))                     //limit of json data
app.use(express.urlencoded({extended:true,limit:"16kb"})) 
app.use(express.static("public"))                         //to store public data like image
app.use(cookieParser())                                   //My server can change user's broswer cookie through cookie parser



export {app}


//app is an object of express use for configuration and middleware