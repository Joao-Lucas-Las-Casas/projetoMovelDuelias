import api from '../config/api';

export const establishmentService = {
    getEstablishments: () => api.get('/establishments'),
    getEstablishment: (id) => api.get(`/establishments/${id}`),
    create: (data) => api.post('/establishments', data),
    update: (id, data) => api.put(`/establishments/${id}`, data),
    remove: (id) => api.delete(`/establishments/${id}`),
};
