const express = require('express');
const router = express.Router();

// Import routes here
// const authRoute = require('./auth.route');

const defaultRoutes = [
  // {
  //   path: '/auth',
  //   route: authRoute,
  // },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
