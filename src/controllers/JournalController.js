import JournalModel from "../models/JournalModel.js";

const JournalController = {
  getJournal: async () => {
    return JournalModel.find({}).sort({ date: -1 });
  },

  insertJournal: async (
    headers,
    exercise,
    reps,
    weight,
    unit,
    style,
    stance,
    equipment,
    position,
  ) => {
    const journal = new JournalModel();
    journal.ip = headers.ip;
    journal.local = headers.local;
    journal.userAgent = headers.userAgent;
    journal.session = headers.session;
    journal.exercise = exercise;
    journal.reps = reps;
    journal.weight = weight;
    journal.unit = unit;
    journal.style = style;
    journal.stance = stance;
    journal.equipment = equipment;
    journal.position = position;
    return journal.save();
  },
};

export default JournalController;
