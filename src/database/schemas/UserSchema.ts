import { Schema } from "mongoose";

export const UserSchema = new Schema(
    {
        userId: { type: String, required: true, unique: true },
        blacklisted: { type: Boolean, required: true, default: false },
        agsToken: { type: String, required: false },
        reason: { type: String, required: false },
    },
    { strictQuery: true }
);
