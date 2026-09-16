const axios = require('axios');

function pick(overrides, platform, key, envKey) {
  const o = overrides?.[platform];
  if (o && o[key]) return o[key];
  return process.env[envKey];
}

function missingPlatforms(overrides = {}) {
  const missing = [];
  if (!pick(overrides, 'facebook', 'accessToken', 'FB_ACCESS_TOKEN') || !pick(overrides, 'facebook', 'pageId', 'FB_PAGE_ID')) {
    missing.push('Facebook');
  }
  if (!pick(overrides, 'instagram', 'accessToken', 'IG_ACCESS_TOKEN') || !pick(overrides, 'instagram', 'businessAccountId', 'IG_BUSINESS_ACCOUNT_ID')) {
    missing.push('Instagram');
  }
  if (!pick(overrides, 'youtube', 'apiKey', 'YT_API_KEY') || !pick(overrides, 'youtube', 'channelId', 'YT_CHANNEL_ID')) {
    missing.push('YouTube');
  }
  if (!pick(overrides, 'tiktok', 'rapidApiKey', 'RAPIDAPI_KEY') || !pick(overrides, 'tiktok', 'username', 'TIKTOK_USERNAME')) {
    missing.push('TikTok');
  }
  if (!pick(overrides, 'linkedin', 'rapidApiKey', 'RAPIDAPI_KEY') || !pick(overrides, 'linkedin', 'companyId', 'LINKEDIN_COMPANY_ID')) {
    missing.push('LinkedIn');
  }
  return missing;
}

function logFetchResult(name, result) {
  if (result.status === 'fulfilled') return;
  const msg = result.reason?.response?.data?.error?.message
    || result.reason?.message
    || 'unknown error';
  console.warn(`[social-analytics] ${name} fetch failed: ${msg}`);
}

async function fetchSocialPlatformData(overrides = {}) {
  const fbToken = pick(overrides, 'facebook', 'accessToken', 'FB_ACCESS_TOKEN');
  const fbPageId = pick(overrides, 'facebook', 'pageId', 'FB_PAGE_ID');
  const igToken = pick(overrides, 'instagram', 'accessToken', 'IG_ACCESS_TOKEN');
  const igAccountId = pick(overrides, 'instagram', 'businessAccountId', 'IG_BUSINESS_ACCOUNT_ID');
  const ytKey = pick(overrides, 'youtube', 'apiKey', 'YT_API_KEY');
  const ytChannelId = pick(overrides, 'youtube', 'channelId', 'YT_CHANNEL_ID');
  const rapidKey = pick(overrides, 'tiktok', 'rapidApiKey', 'RAPIDAPI_KEY')
    || pick(overrides, 'linkedin', 'rapidApiKey', 'RAPIDAPI_KEY');
  const tiktokHost = pick(overrides, 'tiktok', 'apiHost', 'TIKTOK_API_HOST');
  const tiktokUser = pick(overrides, 'tiktok', 'username', 'TIKTOK_USERNAME');
  const linkedinHost = pick(overrides, 'linkedin', 'apiHost', 'LINKEDIN_API_HOST');
  const linkedinCompany = pick(overrides, 'linkedin', 'companyId', 'LINKEDIN_COMPANY_ID');

  const [fbRes, igRes, ytRes, tiktokRes, linkedinRes] = await Promise.allSettled([
    fbToken && fbPageId
      ? axios.get(`https://graph.facebook.com/v18.0/${fbPageId}?fields=followers_count,fan_count&access_token=${fbToken}`, { timeout: 10000 })
      : Promise.reject(new Error('Facebook credentials not configured')),
    igToken && igAccountId
      ? axios.get(`https://graph.facebook.com/v18.0/${igAccountId}?fields=followers_count,media_count&access_token=${igToken}`, { timeout: 10000 })
      : Promise.reject(new Error('Instagram credentials not configured')),
    ytKey && ytChannelId
      ? axios.get(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${ytChannelId}&key=${ytKey}`, { timeout: 10000 })
      : Promise.reject(new Error('YouTube credentials not configured')),
    rapidKey && tiktokHost && tiktokUser
      ? axios.get(`https://${tiktokHost}/user/info?unique_id=${tiktokUser}`, {
        headers: { 'X-RapidAPI-Key': rapidKey, 'X-RapidAPI-Host': tiktokHost },
        timeout: 10000,
      })
      : Promise.reject(new Error('TikTok credentials not configured')),
    rapidKey && linkedinHost && linkedinCompany
      ? axios.get(`https://${linkedinHost}/get-company-details?username=${linkedinCompany}`, {
        headers: { 'X-RapidAPI-Key': rapidKey, 'X-RapidAPI-Host': linkedinHost },
        timeout: 10000,
      })
      : Promise.reject(new Error('LinkedIn credentials not configured')),
  ]);

  logFetchResult('Facebook', fbRes);
  logFetchResult('Instagram', igRes);
  logFetchResult('YouTube', ytRes);
  logFetchResult('TikTok', tiktokRes);
  logFetchResult('LinkedIn', linkedinRes);

  const fb = fbRes.status === 'fulfilled' ? fbRes.value.data : null;
  const ig = igRes.status === 'fulfilled' ? igRes.value.data : null;
  const yt = ytRes.status === 'fulfilled' ? ytRes.value.data : null;
  const tiktok = tiktokRes.status === 'fulfilled' ? tiktokRes.value.data : null;
  const li = linkedinRes.status === 'fulfilled' ? linkedinRes.value.data : null;

  const data = {
    facebook: {
      followers: fb?.followers_count || 0,
      likes: fb?.fan_count || 0,
      status: fb ? 'connected' : 'error',
    },
    instagram: {
      followers: ig?.followers_count || 0,
      posts: ig?.media_count || 0,
      status: ig ? 'connected' : 'error',
    },
    youtube: {
      subscribers: yt?.items?.[0]?.statistics?.subscriberCount || 0,
      views: yt?.items?.[0]?.statistics?.viewCount || 0,
      videos: yt?.items?.[0]?.statistics?.videoCount || 0,
      status: yt?.items?.length ? 'connected' : 'error',
    },
    tiktok: {
      followers: tiktok?.data?.stats?.followerCount || tiktok?.userInfo?.stats?.followerCount || 0,
      likes: tiktok?.data?.stats?.heartCount || tiktok?.userInfo?.stats?.heartCount || 0,
      videos: tiktok?.data?.stats?.videoCount || tiktok?.userInfo?.stats?.videoCount || 0,
      status: tiktok ? 'connected' : 'error',
    },
    linkedin: {
      followers: li?.data?.followerCount || li?.followerCount || 0,
      employees: li?.data?.staffCount || li?.staffCount || 0,
      status: li ? 'connected' : 'error',
    },
  };

  data.totalFollowers =
    parseInt(data.facebook.followers || 0, 10) +
    parseInt(data.instagram.followers || 0, 10) +
    parseInt(data.youtube.subscribers || 0, 10) +
    parseInt(data.tiktok.followers || 0, 10) +
    parseInt(data.linkedin.followers || 0, 10);

  const connectedCount = ['facebook', 'instagram', 'youtube', 'tiktok', 'linkedin']
    .filter((k) => data[k].status === 'connected').length;

  return {
    data,
    meta: {
      connectedPlatforms: connectedCount,
      missingPlatforms: missingPlatforms(overrides),
      usedManualCredentials: Boolean(Object.keys(overrides || {}).length),
    },
  };
}

module.exports = { fetchSocialPlatformData, missingPlatforms };
