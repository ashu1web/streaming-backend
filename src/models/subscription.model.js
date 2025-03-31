import mongoose, {Schema} from "mongoose"

const subscriptionSchema=new Schema({
    subscriber:{
        type:Schema.Types.ObjectId,    //subscriber info
        ref:"User"
    },
    channel:{
        type:Schema.Types.ObjectId,    //channel info
        ref:"User"
    }
},{timestamps:true})



// Unique index to prevent duplicate subscriptions
subscriptionSchema.index({ subscriber: 1, channel: 1 }, { unique: true });

export const Subscription=mongoose.model("Subscription",
    subscriptionSchema
)