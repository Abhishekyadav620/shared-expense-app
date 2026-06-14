/**
 * CSV import API calls.
 */
import api from './api';

/**
 * POST /import — upload a CSV file for parsing.
 *
 * @param {File} file
 * @param {(percent: number) => void} [onUploadProgress]
 */
export async function uploadCsv(file, onUploadProgress) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/import', formData, {
    transformRequest: [(data, headers) => {
      delete headers['Content-Type'];
      return data;
    }],
    onUploadProgress: (event) => {
      if (onUploadProgress && event.total) {
        const percent = Math.round((event.loaded * 100) / event.total);
        onUploadProgress(percent);
      }
    },
  });

  return response.data;
}
