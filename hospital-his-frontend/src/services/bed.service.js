import axios from 'axios';
import { API_URL } from '../config/api';

const BED_URL = `${API_URL}/beds`;

const getConfig = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.token}` } };
};

const bedService = {
    getAllBeds: async (params) => {
        const config = getConfig();
        config.params = params; // ward, status, bedType
        const response = await axios.get(BED_URL, config);
        return response.data;
    },

    getBedById: async (id) => {
        const response = await axios.get(`${BED_URL}/${id}`, getConfig());
        return response.data;
    },

    getWards: async () => {
        const response = await axios.get(`${BED_URL}/wards`, getConfig());
        return response.data;
    },

    getOccupancy: async () => {
        const response = await axios.get(`${BED_URL}/occupancy`, getConfig());
        return response.data;
    },

    allocateBed: async (data) => {
        const response = await axios.post(`${BED_URL}/allocate`, data, getConfig());
        return response.data;
    },

    transferBed: async (data) => {
        const response = await axios.post(`${BED_URL}/transfer`, data, getConfig());
        return response.data;
    }
};

export default bedService;
