const STORAGE_KEY = 'raxwo-social-api-keys';

export const PLATFORM_API_FIELDS = {
  facebook: [
    { key: 'accessToken', label: 'Access Token', placeholder: 'EAABw...' },
    { key: 'pageId', label: 'Page ID', placeholder: '123456789' },
  ],
  instagram: [
    { key: 'accessToken', label: 'Access Token', placeholder: 'IGQV...' },
    { key: 'businessAccountId', label: 'Business Account ID', placeholder: '178414...' },
  ],
  youtube: [
    { key: 'apiKey', label: 'YouTube API Key', placeholder: 'AIza...' },
    { key: 'channelId', label: 'Channel ID', placeholder: 'UC...' },
  ],
  tiktok: [
    { key: 'rapidApiKey', label: 'RapidAPI Key', placeholder: 'Your RapidAPI key' },
    { key: 'apiHost', label: 'API Host', placeholder: 'tiktok-api23.p.rapidapi.com' },
    { key: 'username', label: 'TikTok Username', placeholder: 'brandname' },
  ],
  linkedin: [
    { key: 'rapidApiKey', label: 'RapidAPI Key', placeholder: 'Your RapidAPI key' },
    { key: 'apiHost', label: 'API Host', placeholder: 'linkedin-api8.p.rapidapi.com' },
    { key: 'companyId', label: 'Company Username / ID', placeholder: 'raxwo' },
  ],
};

export function loadSocialApiKeys() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSocialApiKeys(keys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys || {}));
}

export function getPlatformCredentials(platform) {
  const all = loadSocialApiKeys();
  return all[platform] || {};
}

export function savePlatformCredentials(platform, values) {
  const all = loadSocialApiKeys();
  all[platform] = { ...(all[platform] || {}), ...values };
  saveSocialApiKeys(all);
  return all;
}

/** Fetch platform analytics — POST sends manual keys; works on Hostinger without server env vars */
export async function fetchPlatformData(api, credentials) {
  const keys = credentials || loadSocialApiKeys();
  const hasManual = Object.values(keys).some((v) => v && Object.values(v).some(Boolean));
  if (hasManual) {
    const res = await api.post('/platform-data', { credentials: keys });
    return res.data?.data || {};
  }
  const res = await api.get('/platform-data');
  return res.data?.data || {};
}
