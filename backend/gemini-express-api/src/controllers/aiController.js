const geminiService = require('../services/geminiService');
const logger = require('../utils/logger');

async function chat(req, res, next) {
  try {
    const { message, budget = null, expenses = null } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        error: 'The "message" field is required.'
      });
    }

    const response = await geminiService.chat({
      message: message.trim(),
      budget: budget == null ? null : Number(budget),
      expenses: expenses == null ? null : Number(expenses)
    });
    return res.status(200).json(response);
  } catch (error) {
    logger.error('Chat controller failed', { message: error.message });
    return next(error);
  }
}

async function analyzePdf(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'A PDF file is required.'
      });
    }

    const response = await geminiService.analyzePdf(req.file);
    return res.status(200).json(response);
  } catch (error) {
    logger.error('Analyze PDF controller failed', { message: error.message });
    return next(error);
  }
}

module.exports = {
  chat,
  analyzePdf
};
