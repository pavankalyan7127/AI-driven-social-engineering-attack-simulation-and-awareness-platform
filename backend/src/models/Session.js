import mongoose from 'mongoose';

export const ALLOWED_CHANNELS = ['email', 'chat', 'sms', 'website'];
export const ALLOWED_STATUSES = ['active', 'completed', 'reported', 'safe_exit', 'abandoned'];
export const ALLOWED_TERMINAL_STATUSES = ['completed', 'reported', 'safe_exit', 'abandoned'];

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    scenarioId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    channel: {
      type: String,
      required: true,
      enum: {
        values: ALLOWED_CHANNELS,
        message: 'Unsupported channel "{VALUE}". Allowed channels: email, chat, sms, website.'
      },
      trim: true
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ALLOWED_STATUSES,
        message: 'Unsupported status "{VALUE}". Allowed statuses: active, completed, reported, safe_exit, abandoned.'
      },
      default: 'active',
      index: true
    },
    startedAt: {
      type: Date,
      required: true,
      default: () => new Date()
    },
    updatedAt: {
      type: Date,
      required: true,
      default: () => new Date()
    },
    endedAt: {
      type: Date,
      default: null
    }
  },
  {
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        return ret;
      }
    }
  }
);

// Compound queries: session listing/filtering by status and timestamp
sessionSchema.index({ status: 1, startedAt: -1 });
sessionSchema.index({ channel: 1, startedAt: -1 });

export const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);
export default Session;
