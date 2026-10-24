import axios from 'axios';

// Point this to your Heroku URL later (e.g., https://your-app.herokuapp.com/api)
const API_BASE_URL = 'http://localhost:8000/api';

export const fetchGenerationData = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/generation-data`);
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};