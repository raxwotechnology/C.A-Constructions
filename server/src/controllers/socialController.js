const { fetchSocialPlatformData, missingPlatforms } = require('../utils/socialPlatformFetch');

async function respondWithPlatformData(req, res, next) {
  try {
    const credentials = req.body?.credentials || req.query?.credentials
      ? (typeof req.body?.credentials === 'object' ? req.body.credentials : {})
      : {};

    const missing = missingPlatforms(credentials);
    if (missing.length === 5) {
      console.warn('[social-analytics] No platform credentials (env or manual):', missing.join(', '));
    }

    const { data, meta } = await fetchSocialPlatformData(credentials);

    res.json({
      success: true,
      data,
      meta: {
        ...meta,
        warnings: missing.length && meta.connectedPlatforms === 0
          ? missing.map((p) => `${p}: add server env vars or enter API keys in AI Analyzer`)
          : undefined,
      },
    });
  } catch (err) {
    console.error('[social-analytics] Unexpected error:', err.message);
    next(err);
  }
}

exports.getSocialAnalytics = respondWithPlatformData;
exports.postSocialAnalytics = respondWithPlatformData;
