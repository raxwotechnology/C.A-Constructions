const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/raxwo').then(async () => {
  const SiteSetting = require('./server/src/models/SiteSetting');
  const settings = await SiteSetting.findOne();
  console.log("LogoUrl starts with:", settings?.logoUrl?.substring(0, 50));
  mongoose.connection.close();
});
