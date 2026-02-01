import axios from 'axios';
import { API_URL } from '../config/api';

const STAFF_URL = `${API_URL}/staff`;

const getConfig = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.token}` } };
};

const staffService = {
    getAllStaff: async (params) => {
        const config = getConfig();
        config.params = params;
        const response = await axios.get(STAFF_URL, config);
        return response.data;
    },

    getDoctors: async () => {
        const response = await axios.get(`${STAFF_URL}/doctors`, getConfig());
        return response.data;
    },

    getStaffById: async (id) => {
        const response = await axios.get(`${STAFF_URL}/${id}`, getConfig());
        return response.data;
    }
};

export default staffService;
