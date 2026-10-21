import mongoose from 'mongoose';

export const ALLOWED_EVENT_TYPES = [
  // Universal & Lifecycle
  'scenario_viewed',
  'threat_reported',
  'safe_exit',
  'user_blocked_sender',
  'scenario_completed',
  'simulation_completed',
  'simulation_started',
  'simulation_abandoned',
  'view_changed',
  'interaction_recorded',

  // Email channel
  'message_opened',
  'message_starred',
  'message_unstarred',
  'simulated_link_clicked',
  'link_clicked',
  'reply_sent',
  'chat_rail_clicked',
  'meet_rail_clicked',
  'inbox_refreshed',
  'pagination_clicked',
  'message_archived',
  'message_deleted',
  'message_snoozed',
  'added_to_tasks',
  'move_to_clicked',
  'labels_clicked',
  'forward_clicked',
  'side_tool_clicked',

  // Chat & SMS channels
  'conversation_opened',
  'message_sent',
  'attachment_interaction',
  'attachment_opened',
  'voice_interaction',
  'warning_sign_selected',

  // Website channel
  'virtual_page_viewed',
  'page_navigated',
  'virtual_navigation',
  'browser_back',
  'browser_forward',
  'form_interaction',
  'form_submitted',
  'simulated_form_submitted',
  'virtual_link_clicked',
  'credential_submitted'
];

const simulationEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    sessionId: {
      type: String,
      required: true,
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
      enum: ['email', 'chat', 'sms', 'website'],
      trim: true
    },
    eventType: {
      type: String,
      required: true,
      enum: {
        values: ALLOWED_EVENT_TYPES,
        message: 'Unsupported event type "{VALUE}".'
      },
      trim: true,
      index: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: () => new Date()
    },
    clientTimestamp: {
      type: Date,
      default: null
    },
    clientEventId: {
      type: String,
      default: null,
      trim: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    },
    createdAt: {
      type: Date,
      required: true,
      default: () => new Date()
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

// Compound index for chronological querying of a session's events
simulationEventSchema.index({ sessionId: 1, timestamp: 1 });
// Compound index for idempotent deduplication when clientEventId is supplied
simulationEventSchema.index({ sessionId: 1, clientEventId: 1 }, { sparse: true });

export const SimulationEvent =
  mongoose.models.SimulationEvent || mongoose.model('SimulationEvent', simulationEventSchema);

export default SimulationEvent;
