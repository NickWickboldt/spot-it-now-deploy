import axios from 'axios';
// You'll need a way to get the auth token, e.g., from AsyncStorage or a state manager
// import { getAuthToken } from './auth'; 

// IMPORTANT: Replace with your computer's local IP address
const API_URL = 'http://192.168.1.10:8000/api/v1';

const createLogEntry = async (level, message, meta = {}) => {
  // 1. Log to the developer console immediately
  console.log(`[${level}] - ${message}`, meta);

  // 2. Send the log to the backend
  try {
    // const token = await getAuthToken(); // Get the JWT token if the user is logged in
    
    await axios.post(`${API_URL}/logs/submit`, 
      {
        level: level.toUpperCase(),
        source: 'frontend',
        message,
        meta,
      },
      // {
      //   headers: {
      //     Authorization: `Bearer ${token}`,
      //   },
      // }
    );
  } catch (error) {
    // If the logger API call fails, log that error to the console
    console.error('Frontend logger failed to submit log:', error);
  }
};

// The logger object you will import and use in your components
export const log = {
  info: (message, meta) => createLogEntry('info', message, meta),
  warn: (message, meta) => createLogEntry('warn', message, meta),
  error: (message, meta) => createLogEntry('error', message, meta),
  debug: (message, meta) => createLogEntry('debug', message, meta),
};
