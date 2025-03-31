import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app=express()

app.use(cors({                                             // Allows requests only from the specified origin
    origin:process.env.CORS_ORIGIN,                        // Allows sending cookies and authentication headers
    credentials:true,
}))

app.use(express.json({limit:"16kb"}))                     //limit of json data
app.use(express.urlencoded({extended:true,limit:"16kb"})) //url data
app.use(express.static("public"))                         //to store public data like image
app.use(cookieParser())                                   //Req,res have cookie access,My server can change user's broswer cookie through cookie parser

//routes import 
//routes import
import userRouter from './routes/user.routes.js'
import tweetRouter from "./routes/tweet.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import videoRouter from "./routes/video.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"


//routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlist", playlistRouter)


// http://localhost:8000/api/v1/users/register

export { app }


//app is an object of expres and its app.use() is used for configuration and middleware