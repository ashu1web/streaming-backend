import mongoose, {Schema} from "mongoose"

const subscriptionSchema=new Schema({
    subcriber:{
        type:Schema.Types.ObjectId,    //subscriber info
        ref:User
    },
    channel:{
        type:Schema.Types.ObjectId,    //channel info
        ref:User
    }
})

export coonst Subscription=mongoose.model("Subscription",
    subscriptionSchema
)