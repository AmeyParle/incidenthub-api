const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const rootRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');
const { swaggerServe, swaggerSetup } = require('./config/swagger');

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(cors({
  origin: '*'
}));
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'IncidentHub API is running'
  });
});

app.get('/ready', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'IncidentHub API is ready'
  });
});

app.use('/docs', swaggerServe, swaggerSetup);
app.use('/api', rootRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;