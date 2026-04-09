import apiClient from '../../api/client';

export const getEnquiries = async () => {
  const response = await apiClient.get('/enquiries');
  return Array.isArray(response.data) ? response.data : [];
};

export const createEnquiry = async (payload) => {
  const response = await apiClient.post('/enquiries', payload);
  return response.data;
};

export const updateEnquiry = async (id, payload) => {
  const response = await apiClient.put(`/enquiries/${id}`, payload);
  return response.data;
};

export const deleteEnquiry = async (id) => {
  const response = await apiClient.delete(`/enquiries/${id}`);
  return response.data;
};
