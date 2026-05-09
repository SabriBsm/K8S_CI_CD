const { GoogleGenerativeAI } = require('@google/generative-ai');
const { geminiApiKey, geminiModel } = require('../config/env');
const logger = require('../utils/logger');

const CHAT_SYSTEM_PROMPT = [
  'You are a financial AI assistant specialized in project management.',
  'Estimate costs, analyze budgets, and evaluate project financial health.',
  'Reply with strict JSON only.'
].join(' ');

const PDF_PROMPT = [
  'Analyze this financial report and return strict JSON only.',
  'Fields:',
  '- budget: number or null',
  '- expenses: number or null',
  '- status: "ACCEPTABLE" or "NOT ACCEPTABLE" or null',
  '- summary: short summary',
  '- analysis: short explanation',
  '- risks: array of short strings',
  '- recommendations: array of short strings'
].join('\n');

class GeminiService {
  constructor() {
    this.genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

    if (!this.genAI) {
      logger.warn('Gemini API key is missing. Service will use fallback responses.');
      return;
    }

    console.log('Using Gemini model:', geminiModel);
  }

  async chat({ message, budget = null, expenses = null }) {
    if (!this.genAI) {
      return this.buildChatFallback(message, budget, expenses, 'Gemini API key is not configured.');
    }

    const prompt = this.buildChatPrompt({ message, budget, expenses });

    try {
      const text = await this.generateAI(prompt);
      const parsed = this.parseJsonPayload(text);
      const response = this.normalizeChatResponse(parsed, { message, budget, expenses });

      logger.info('Gemini chat response generated', {
        model: geminiModel,
        preview: response.reply.slice(0, 120)
      });

      return response;
    } catch (error) {
      logger.error('Gemini chat failed, returning fallback', {
        model: geminiModel,
        message: error.message
      });

      return this.buildChatFallback(message, budget, expenses, error.message);
    }
  }

  async analyzePdf(file) {
    if (!this.genAI) {
      return this.buildPdfFallback(file?.originalname, 'Gemini API key is not configured.');
    }

    const request = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: PDF_PROMPT },
            {
              inlineData: {
                mimeType: file.mimetype || 'application/pdf',
                data: file.buffer.toString('base64')
              }
            }
          ]
        }
      ]
    };

    try {
      const text = await this.generateAI(request);
      const parsed = this.parseJsonPayload(text);
      const response = this.normalizePdfResponse(parsed, file?.originalname);

      logger.info('Gemini PDF analysis generated', {
        fileName: file?.originalname,
        model: geminiModel,
        preview: response.analysis.slice(0, 120)
      });

      return response;
    } catch (error) {
      logger.error('Gemini PDF analysis failed, returning fallback', {
        fileName: file?.originalname,
        model: geminiModel,
        message: error.message
      });

      return this.buildPdfFallback(file?.originalname, error.message);
    }
  }

  async generateAI(prompt) {
    const model = this.genAI.getGenerativeModel({ model: geminiModel });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }

  buildChatPrompt({ message, budget, expenses }) {
    const variance = this.computeVariance(budget, expenses);
    const sections = [
      CHAT_SYSTEM_PROMPT,
      'Return JSON with fields: reply, status, variance, recommendations.',
      `User message: ${message}`
    ];

    if (budget != null) {
      sections.push(`Budget: ${budget}`);
    }

    if (expenses != null) {
      sections.push(`Expenses: ${expenses}`);
    }

    if (variance != null) {
      sections.push(`Variance: ${variance}`);
      sections.push(`Status rule: ${variance >= 0 ? 'ACCEPTABLE' : 'NON ACCEPTABLE'}`);
    }

    return sections.join('\n');
  }

  parseJsonPayload(text) {
    const raw = String(text || '').trim();

    if (!raw) {
      return {};
    }

    const candidates = [
      raw,
      raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim(),
      raw.replace(/^```\s*/i, '').replace(/```$/i, '').trim()
    ];

    const objectMatch = raw.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      candidates.push(objectMatch[0]);
    }

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch (error) {
        logger.warn('Unable to parse Gemini JSON candidate', {
          message: error.message
        });
      }
    }

    return { rawText: raw };
  }

  normalizeChatResponse(parsed, { message, budget, expenses }) {
    const fallbackStatus = this.computeStatus(budget, expenses);
    const fallbackVariance = this.computeVariance(budget, expenses);

    return {
      reply: parsed.reply || parsed.analysis || parsed.rawText || 'Gemini returned an empty reply.',
      status: this.normalizeStatus(parsed.status) || fallbackStatus,
      variance: this.normalizeNumber(parsed.variance, fallbackVariance),
      recommendations: this.normalizeRecommendations(parsed.recommendations, fallbackStatus),
      source: 'gemini',
      model: geminiModel,
      meta: {
        message,
        budget,
        expenses
      }
    };
  }

  normalizePdfResponse(parsed, fileName) {
    const budget = this.normalizeNumber(parsed.budget, null);
    const expenses = this.normalizeNumber(parsed.expenses, null);
    const status = this.normalizeStatus(parsed.status) || this.computeStatus(budget, expenses);
    const summary = parsed.summary || parsed.analysis || parsed.reply || parsed.rawText || 'Gemini returned an empty summary.';
    const analysis = parsed.analysis || parsed.summary || parsed.reply || parsed.rawText || 'Gemini returned an empty analysis.';

    return {
      fileName: fileName || null,
      budget,
      expenses,
      status,
      summary,
      analysis,
      risks: this.normalizeRisks(parsed.risks, status, analysis),
      recommendations: this.normalizeRecommendations(parsed.recommendations, status),
      source: 'gemini',
      model: geminiModel
    };
  }

  buildChatFallback(message, budget, expenses, reason) {
    const status = this.computeStatus(budget, expenses);
    const variance = this.computeVariance(budget, expenses);
    const hasNumbers = budget != null && expenses != null && variance != null;

    let reply = 'AI temporarily unavailable (fallback). Please try again.';
    if (hasNumbers && status === 'ACCEPTABLE') {
      reply = `AI temporarily unavailable (fallback). The project looks ACCEPTABLE with ${this.formatCurrency(variance)} remaining.`;
    } else if (hasNumbers && status === 'NON ACCEPTABLE') {
      reply = `AI temporarily unavailable (fallback). The project looks NON ACCEPTABLE with ${this.formatCurrency(Math.abs(variance))} over budget.`;
    } else if (message) {
      reply = 'AI temporarily unavailable (fallback). Please retry in a moment.';
    }

    return {
      reply,
      status,
      variance,
      recommendations: this.normalizeRecommendations([], status),
      source: 'fallback',
      model: null,
      error: reason || null
    };
  }

  buildPdfFallback(fileName, reason) {
    return {
      fileName: fileName || null,
      budget: null,
      expenses: null,
      status: null,
      summary: 'AI temporarily unavailable (fallback). The PDF could not be analyzed automatically.',
      analysis: 'AI temporarily unavailable (fallback). The PDF could not be analyzed automatically.',
      risks: ['The document requires a manual finance review because Gemini is unavailable.'],
      recommendations: ['Retry the upload when Gemini is available.'],
      source: 'fallback',
      model: null,
      error: reason || null
    };
  }

  normalizeStatus(status) {
    const normalized = String(status || '').trim().toUpperCase();
    if (normalized === 'ACCEPTABLE') {
      return 'ACCEPTABLE';
    }

    if (normalized === 'NON ACCEPTABLE' || normalized === 'NOT ACCEPTABLE') {
      return 'NOT ACCEPTABLE';
    }

    return null;
  }

  normalizeRisks(risks, status, analysis) {
    if (Array.isArray(risks) && risks.length) {
      return risks.map((entry) => String(entry).trim()).filter(Boolean);
    }

    if (status === 'NOT ACCEPTABLE') {
      return [
        'Potential budget overrun detected.',
        'Spending requires closer approval before new commitments.'
      ];
    }

    if (status === 'ACCEPTABLE') {
      return ['No major overrun was detected from the extracted financial totals.'];
    }

    if (analysis) {
      return ['The uploaded PDF needs manual validation because the AI result was only partially structured.'];
    }

    return ['Retry the analysis or review the document manually.'];
  }

  normalizeRecommendations(recommendations, status) {
    if (Array.isArray(recommendations) && recommendations.length) {
      return recommendations.map((entry) => String(entry).trim()).filter(Boolean);
    }

    if (status === 'ACCEPTABLE') {
      return [
        'Maintain current spending.',
        'Optimize the remaining budget.',
        'Continue monitoring high-impact costs.'
      ];
    }

    if (status === 'NOT ACCEPTABLE') {
      return [
        'Reduce unnecessary costs.',
        'Optimize resource allocation.',
        'Monitor expensive tasks closely.'
      ];
    }

    return ['Retry when the AI service is available.'];
  }

  normalizeNumber(value, fallback) {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  computeVariance(budget, expenses) {
    if (budget == null || expenses == null || Number.isNaN(Number(budget)) || Number.isNaN(Number(expenses))) {
      return null;
    }

    return Number(budget) - Number(expenses);
  }

  computeStatus(budget, expenses) {
    const variance = this.computeVariance(budget, expenses);
    if (variance == null) {
      return null;
    }

    return variance >= 0 ? 'ACCEPTABLE' : 'NOT ACCEPTABLE';
  }

  formatCurrency(amount) {
    return `$${Number(amount).toFixed(2)}`;
  }
}

module.exports = new GeminiService();
