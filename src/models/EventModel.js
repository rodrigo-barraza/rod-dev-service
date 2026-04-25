import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    local: String,
    session: String,
    category: String,
    action: String,
    label: String,
    value: String,
    ip: String,
  },
  {
    collection: "Events",
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

const EventModel = mongoose.model("EventModel", EventSchema);
export default EventModel;
