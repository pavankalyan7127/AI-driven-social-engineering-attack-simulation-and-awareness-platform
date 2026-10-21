import mongoose from 'mongoose';

const factorSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true
    },
    eventCount: {
      type: Number,
      required: true,
      default: 1
    },
    scoreImpact: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    }
  },
  { _id: false }
);

const behaviorScoreSchema = new mongoose.Schema(
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
      enum: ['email', 'chat', 'sms', 'website', 'whatsapp', 'instagram', 'telegram', 'call'],
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
      enum: ['low', 'moderate', 'high', 'critical']
    },
    factors: {
      type: [factorSchema],
      default: []
    },
    scoringVersion: {
      type: String,
      required: true,
      default: '1.0.0'
    },
    calculatedAt: {
      type: Date,
      required: true,
      default: () => new Date()
    },
    eventCount: {
      type: Number,
      required: true,
      default: 0
    },
    status: {
      type: String,
      required: true,
      enum: ['provisional', 'final'],
      default: 'final'
    },
    outcome: {
      type: String,
      enum: ['positive', 'negative', 'incomplete', 'abandoned', null],
      default: null,
      index: true
    },
    triggeredConditionId: {
      type: String,
      default: null,
      trim: true
    },
    formulaVersion: {
      type: String,
      required: true,
      default: '2.0.0'
    },
    outcomeEvidence: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    revision: {
      type: Number,
      required: true,
      default: 1
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

behaviorScoreSchema.index({ riskLevel: 1, calculatedAt: -1 });

export const BehaviorScore =
  mongoose.models.BehaviorScore || mongoose.model('BehaviorScore', behaviorScoreSchema);

export default BehaviorScore;
