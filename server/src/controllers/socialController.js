const axios = require('axios');

exports.getSocialAnalytics = async (req, res, next) => {
  try {
    require('dotenv').config();
    const {
      FB_ACCESS_TOKEN,
      FB_PAGE_ID,
      IG_ACCESS_TOKEN,
      IG_BUSINESS_ACCOUNT_ID,
      YT_API_KEY,
      YT_CHANNEL_ID,
      RAPIDAPI_KEY,
      TIKTOK_API_HOST,
      TIKTOK_USERNAME,
      LINKEDIN_API_HOST,
      LINKEDIN_COMPANY_ID,
    } = process.env;

    const [fbRes, igRes, ytRes, tiktokRes, linkedinRes] = await Promise.allSettled([
      // Facebook
      axios.get(`https://graph.facebook.com/v18.0/${FB_PAGE_ID}?fields=followers_count,fan_count&access_token=${FB_ACCESS_TOKEN}`),
      
      // Instagram
      axios.get(`https://graph.facebook.com/v18.0/${IG_BUSINESS_ACCOUNT_ID}?fields=followers_count,media_count&access_token=${IG_ACCESS_TOKEN}`),

      // YouTube
      axios.get(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${YT_CHANNEL_ID}&key=${YT_API_KEY}`),

      // TikTok
      axios.get(`https://${TIKTOK_API_HOST}/user/info?unique_id=${TIKTOK_USERNAME}`, {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': TIKTOK_API_HOST
        }
      }),

      // LinkedIn
      axios.get(`https://${LINKEDIN_API_HOST}/get-company-details?username=${LINKEDIN_COMPANY_ID}`, {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': LINKEDIN_API_HOST
        }
      })
    ]);

    const formatData = () => {
      // Base Fallback Objects
      const fb = fbRes.status === 'fulfilled' ? fbRes.value.data : null;
      const ig = igRes.status === 'fulfilled' ? igRes.value.data : null;
      const yt = ytRes.status === 'fulfilled' ? ytRes.value.data : null;
      const tiktok = tiktokRes.status === 'fulfilled' ? tiktokRes.value.data : null;
      const li = linkedinRes.status === 'fulfilled' ? linkedinRes.value.data : null;

      const data = {
        facebook: {
          followers: fb?.followers_count || 0,
          likes: fb?.fan_count || 0,
          status: fb ? 'connected' : 'error'
        },
        instagram: {
          followers: ig?.followers_count || 0,
          posts: ig?.media_count || 0,
          status: ig ? 'connected' : 'error'
        },
        youtube: {
          subscribers: yt?.items?.[0]?.statistics?.subscriberCount || 0,
          views: yt?.items?.[0]?.statistics?.viewCount || 0,
          videos: yt?.items?.[0]?.statistics?.videoCount || 0,
          status: yt?.items?.length ? 'connected' : 'error'
        },
        tiktok: {
          followers: tiktok?.data?.stats?.followerCount || tiktok?.userInfo?.stats?.followerCount || 0,
          likes: tiktok?.data?.stats?.heartCount || tiktok?.userInfo?.stats?.heartCount || 0,
          videos: tiktok?.data?.stats?.videoCount || tiktok?.userInfo?.stats?.videoCount || 0,
          status: tiktok ? 'connected' : 'error'
        },
        linkedin: {
          followers: li?.data?.followerCount || li?.followerCount || 0, 
          employees: li?.data?.staffCount || li?.staffCount || 0,
          status: li ? 'connected' : 'error'
        }
      };

      // Aggregates
      data.totalFollowers = 
        parseInt(data.facebook.followers || 0) + 
        parseInt(data.instagram.followers || 0) + 
        parseInt(data.youtube.subscribers || 0) + 
        parseInt(data.tiktok.followers || 0) + 
        parseInt(data.linkedin.followers || 0);

      return data;
    };

    res.json({
      success: true,
      data: formatData()
    });

  } catch (err) {
    next(err);
  }
};
