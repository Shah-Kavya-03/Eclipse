const Conversation = require("../models/Conversation");
const pythonMlClient = require("../services/pythonMlClient");

/**
 * @route   POST /api/chat (or /chat)
 * @desc    Main guardrail chat pipeline endpoint
 * @access  Public
 */
const handleChat = async (req, res) => {
  try {
    const { prompt, session_id, user_id, provider } = req.body;

    if (!prompt || !session_id) {
      return res.status(400).json({
        success: false,
        detail: "`prompt` and `session_id` are required.",
      });
    }

    const userId = user_id || (req.user ? req.user._id.toString() : "guest");

    // 1. Fetch or initialize conversation document
    let conversation = await Conversation.findOne({ session_id });

    if (!conversation) {
      conversation = await Conversation.create({
        session_id,
        user_id: userId,
        messages: [],
        status: "Protected",
        model_used: provider ? provider.toUpperCase() : "Gemini",
      });
    }

    // 2. Format recent history (last 10 messages) for LLM context
    const historyMessages = (conversation.messages || [])
      .slice(-10)
      .map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

    // 3. Invoke internal Python ML Guardrail Microservice
    const mlResult = await pythonMlClient.processChat({
      prompt,
      session_id,
      user_id: userId,
      provider,
      history: historyMessages,
    });

    // 4. Update Conversation state if request was not blocked
    const maskedPrompt = mlResult.masked_prompt || prompt;

    if (mlResult.blocked) {
      // For blocked prompts, return immediately without storing to conversation
      return res.json({
        status: mlResult.status,
        response: null,
        blocked_reason: mlResult.blocked_reason,
        lime_explanation: mlResult.lime_explanation,
        masked_prompt: maskedPrompt,
        model_used: null,
        api_used: null,
        threat_tier: mlResult.threat_tier,
      });
    }

    const aiResponseText = mlResult.response;

    // Push both user masked prompt and AI reply to conversation messages
    conversation.messages.push({
      sender: "user",
      text: maskedPrompt,
      timestamp: new Date(),
    });

    if (aiResponseText) {
      conversation.messages.push({
        sender: "assistant",
        text: aiResponseText,
        timestamp: new Date(),
      });
    }

    conversation.status =
      mlResult.status === "PII Detected" ? "Modified" : "Protected";
    conversation.model_used = mlResult.model_used || conversation.model_used;
    conversation.api_used = mlResult.api_used || conversation.api_used;

    await conversation.save();

    // 5. Return standardized response matching frontend contract 1:1
    return res.json({
      status: mlResult.status,
      response: aiResponseText,
      blocked_reason: null,
      lime_explanation: mlResult.lime_explanation,
      masked_prompt: maskedPrompt,
      model_used: mlResult.model_used,
      api_used: mlResult.api_used,
      threat_tier: mlResult.threat_tier,
      entities_detected: mlResult.entities_detected || [],
    });
  } catch (error) {
    console.error("[Chat Controller Error]:", error);
    return res.status(500).json({
      success: false,
      detail:
        error.message ||
        "Could not process prompt through guardrail pipeline.",
    });
  }
};

module.exports = {
  handleChat,
};
