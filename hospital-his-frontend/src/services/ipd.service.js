import axios from 'axios';
import { API_URL } from '../config/api';

const IPD_URL = `${API_URL}/ipd`;

const getConfig = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.token}` } };
};

const ipdService = {
    getDashboardStats: async () => {
        const response = await axios.get(`${IPD_URL}/dashboard`, getConfig());
        return response.data;
    },

    getAllAdmissions: async (params) => {
        const config = getConfig();
        config.params = params;
        const response = await axios.get(`${IPD_URL}/admissions`, config);
        return response.data;
    },

    createAdmission: async (data) => {
        const response = await axios.post(`${IPD_URL}/admissions`, data, getConfig());
        return response.data;
    },

    getAdmissionById: async (id) => {
        const response = await axios.get(`${IPD_URL}/admissions/${id}`, getConfig());
        return response.data;
    },

    updateAdmission: async (id, data) => {
        const response = await axios.put(`${IPD_URL}/admissions/${id}`, data, getConfig());
        return response.data;
    },

    dischargePatient: async (id) => {
        const response = await axios.post(`${IPD_URL}/admissions/${id}/discharge`, {}, getConfig());
        return response.data;
    },

    getAdmittedPatients: async () => {
        const response = await axios.get(`${IPD_URL}/patients`, getConfig());
        return response.data;
    },

    addVitals: async (id, data) => {
        const response = await axios.post(`${IPD_URL}/admissions/${id}/vitals`, data, getConfig());
        return response.data;
    },

    addClinicalNote: async (id, data) => {
        const response = await axios.post(`${IPD_URL}/admissions/${id}/notes`, data, getConfig());
        return response.data;
    },

    approveDischarge: async (id) => {
        const response = await axios.post(`${IPD_URL}/admissions/${id}/approve-discharge`, {}, getConfig());
        return response.data;
    },

    createRequest: async (data) => {
        const response = await axios.post(`${IPD_URL}/requests`, data, getConfig());
        return response.data;
    },

    getPendingRequests: async () => {
        const response = await axios.get(`${IPD_URL}/requests`, getConfig());
        return response.data;
    }
};

export default ipdService;
