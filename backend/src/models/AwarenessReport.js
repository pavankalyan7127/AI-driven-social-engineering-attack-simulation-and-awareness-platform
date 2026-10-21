import mongoose from 'mongoose';

export const ALLOWED_CHANNELS = ['email', 'chat', 'sms', 'website', 'whatsapp', 'instagram', 'telegram', 'call'];
export const ALLOWED_RISK_LEVELS = ['low', 'moderate', 'high', 'critical'];
export const ALLOWED_REPORT_STATUSES = ['generating', 'completed', 'failed'];

const keyEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    timestamp: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const awarenessReportSchema = new mongoose.Schema(
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
        message: 'Unsupported channel "{VALUE}".'
      },
      trim: true
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    riskLevel: {
      type: String,
      required: true,
      enum: {
        values: ALLOWED_RISK_LEVELS,
        message: 'Unsupported riskLevel "{VALUE}".'
      }
    },
    scoreRevision: {
      type: Number,
      required: true,
      default: 1
    },
    scoringVersion: {
      type: String,
      required: true,
      default: '1.0.0'
    },
    reportVersion: {
      type: String,
      required: true,
      default: '1.0.0'
    },
    generatedAt: {
      type: Date,
      required: true,
      default: () => new Date()
    },
    summary: {
      type: String,
      required: true,
      trim: true
    },
    strengths: {
      type: [String],
      default: []
    },
    riskyBehaviors: {
      type: [String],
      default: []
    },
    threatIndicators: {
      type: [String],
      default: []
    },
    recommendations: {
      type: [String],
      default: []
    },
    keyEvents: {
      type: [keyEventSchema],
      default: []
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ALLOWED_REPORT_STATUSES,
        message: 'Unsupported report status "{VALUE}".'
      },
      default: 'completed'
    },
    attackClassification: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    providerModel: {
      type: String,
      trim: true,
      default: 'openai/gpt-oss-20b'
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

awarenessReportSchema.index({ riskLevel: 1, generatedAt: -1 });

export const AwarenessReport =
  mongoose.models.AwarenessReport || mongoose.model('AwarenessReport', awarenessReportSchema);

export default AwarenessReport;
