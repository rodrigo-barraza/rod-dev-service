import EventModel from "../models/EventModel.js";
import SessionModel from "../models/SessionModel.js";

const EventController = {
  insertEvent: (category, action, label, value, headers) => {
    const event = new EventModel();
    event.ip = headers.ip;
    event.local = headers.local;
    event.userAgent = headers.userAgent;
    event.session = headers.session;
    event.category = category;
    event.action = action;
    event.label = label;
    event.value = value;
    return event.save();
  },

  insertSession: (duration, width, height, headers) => {
    return SessionModel.findOneAndUpdate(
      { session: headers.session },
      {
        $inc: { duration },
        $set: {
          userAgent: headers.userAgent,
          local: headers.local,
          ip: headers.ip,
          width,
          height,
        },
      },
      { new: true, upsert: true },
    );
  },
};

export default EventController;
