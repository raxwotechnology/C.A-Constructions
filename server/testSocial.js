require('dotenv').config({ path: '../.env' });
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
const axios = require('axios');

async function test() {
  const [fbRes, igRes, ytRes, tiktokRes, linkedinRes] = await Promise.allSettled([
    axios.get(`https://graph.facebook.com/v18.0/${FB_PAGE_ID}?fields=followers_count,fan_count&access_token=${FB_ACCESS_TOKEN}`),
    axios.get(`https://graph.facebook.com/v18.0/${IG_BUSINESS_ACCOUNT_ID}?fields=followers_count,media_count&access_token=${IG_ACCESS_TOKEN}`),
    axios.get(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${YT_CHANNEL_ID}&key=${YT_API_KEY}`),
    axios.get(`https://${TIKTOK_API_HOST}/user/info?unique_id=${TIKTOK_USERNAME}`, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': TIKTOK_API_HOST
      }
    }),
    axios.get(`https://${LINKEDIN_API_HOST}/get-company-details?username=${LINKEDIN_COMPANY_ID}`, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': LINKEDIN_API_HOST
      }
    })
  ]);

  if (fbRes.status === 'rejected') console.log('FB Error:', fbRes.reason?.response?.data || fbRes.reason.message);
  else console.log('FB Success:', fbRes.value.data);

  if (igRes.status === 'rejected') console.log('IG Error:', igRes.reason?.response?.data || igRes.reason.message);
  else console.log('IG Success:', igRes.value.data);

  if (ytRes.status === 'rejected') console.log('YT Error:', ytRes.reason?.response?.data || ytRes.reason.message);
  else console.log('YT Success:', ytRes.value.data);

  if (tiktokRes.status === 'rejected') console.log('TikTok Error:', tiktokRes.reason?.response?.data || tiktokRes.reason.message);
  else console.log('TikTok Success:', tiktokRes.value.data);

  if (linkedinRes.status === 'rejected') console.log('LinkedIn Error:', linkedinRes.reason?.response?.data || linkedinRes.reason.message);
  else console.log('LinkedIn Success:', linkedinRes.value.data);
}
test();
