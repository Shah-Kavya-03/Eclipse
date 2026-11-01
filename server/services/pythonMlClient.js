const axios = require("axios");

const pythonBaseUrl =
  process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8001";
const internalSecret =
  process.env.INTERNAL_SERVICE_KEY ||
  "eclipse_internal_guardrail_secret_key_2026";
const serviceTimeout =
  parseInt(process.env.PYTHON_SERVICE_TIMEOUT, 10) || 120000;

const apiClient = axios.create({
  baseURL: pythonBaseUrl,
  timeout: serviceTimeout,
  headers: {
    "Content-Type": "application/json",
    "X-Internal-Secret": internalSecret,
  },
});

/**
 * Call internal Python guardrail pipeline.
 */
const processChat = async ({ prompt, session_id, user_id, provider, history }) => {
  try {
    const response = await apiClient.post("/internal/process-chat", {
      prompt,
      session_id,
      user_id: user_id || "guest",
      provider: provider || null,
      history: history || [],
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(
        `[Python ML Client Error]: Status ${error.response.status} -`,
        error.response.data
      );
      throw new Error(
        error.response.data.detail || "Guardrail ML service error."
      );
    }
    console.error(`[Python ML Client Network Error]:`, error.message);
    if (
      error.code === "ECONNABORTED" ||
      (error.message && error.message.toLowerCase().includes("timeout"))
    ) {
      throw new Error(
        `Python ML guardrail service timed out after ${serviceTimeout / 1000} seconds. The pipeline or LLM provider rotation is slow or unresponsive.`
      );
    }
    if (error.code === "ECONNREFUSED") {
      throw new Error(
        "Could not connect to Python ML guardrail service on port 8001 (Connection Refused). Please ensure the FastAPI microservice is running: cd backend && uvicorn main:app --host 127.0.0.1 --port 8001"
      );
    }
    throw new Error(
      `Could not connect to Python ML guardrail service (${error.message}). Is the microservice running on port 8001?`
    );
  }
};

/**
 * Fetch anomaly detection results from Python ML service.
 */
const getAnomalies = async () => {
  try {
    const response = await apiClient.get("/internal/anomalies");
    return response.data;
  } catch (error) {
    console.error("[Python ML Anomalies Error]:", error.message);
    return {
      message: "Anomaly detection service temporarily unavailable.",
      anomalies: [],
    };
  }
};

/**
 * Download generated DPDP PDF report stream from Python ML service.
 */
const getReportStream = async (type, id) => {
  return apiClient.get(`/internal/report/download`, {
    params: { type, id },
    responseType: "stream",
  });
};

module.exports = {
  processChat,
  getAnomalies,
  getReportStream,
};
