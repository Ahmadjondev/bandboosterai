// XHR-based upload helper with progress support for manager API
export interface UploadOptions {
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  onProgress?: (percent: number) => void;
}

export function uploadWithProgress(endpoint: string, formData: FormData, options: UploadOptions = {}): Promise<any> {
  const { method = 'POST', headers = {}, onProgress } = options;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, endpoint);

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = xhr.responseText ? JSON.parse(xhr.responseText) : null;
          resolve(res);
        } catch (err) {
          resolve(null);
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(err);
        } catch (e) {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = function () {
      reject(new Error('Network error while uploading'));
    };

    xhr.onabort = function () {
      reject(new Error('Upload aborted'));
    };

    xhr.upload.onprogress = function (event) {
      if (event.lengthComputable && typeof onProgress === 'function') {
        const pct = Math.round((event.loaded / event.total) * 100);
        onProgress(pct);
      }
    };

    Object.entries(headers || {}).forEach(([k, v]) => {
      xhr.setRequestHeader(k, v);
    });

    xhr.send(formData);
  });
}
